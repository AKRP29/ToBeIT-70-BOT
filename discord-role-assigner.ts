import fs from 'fs';
import csv from 'csv-parser';
import { Pool, type PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

// Load environment variables
dotenv.config();

// Types
interface CSVAcceptedCamper {
  'รายชื่อ': string;        // Full name with nickname
  'คำนำหน้า': string;        // Prefix (นาย/นางสาว)
  'ชื่อจริง': string;        // First name
  'นามสกุล': string;         // Last name
  'ชื่อเล่น': string;        // Nickname
  'สถานะ': string;           // Status
}

interface ProcessedCamper {
  fullName: string;
  prefix: string;
  firstName: string;
  lastName: string;
  nickname: string;
  status: string;
}

interface DatabaseUser {
  user_id: string;
  first_name: string;
  last_name: string;
  prefix?: string;
}

interface DiscordAccount {
  account_id: string;
  user_id: string;
  provider_id: string;
}

interface ProcessingResult {
  total: number;
  foundInDatabase: number;
  discordAccountsFound: number;
  rolesAssigned: number;
  errors: number;
  failedCampers: Array<{
    name: string;
    reason: string;
  }>;
}

// Database configuration
const dbConfig: PoolConfig = {
  user: process.env.DB_USER || 'your_db_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'your_database',
  password: process.env.DB_PASSWORD || 'your_db_password',
  port: parseInt(process.env.DB_PORT || '5432'),
};

// Discord configuration
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_ROLE_ID = process.env.DISCORD_ROLE_ID;

// Initialize PostgreSQL pool
const pool = new Pool(dbConfig);

// Initialize Discord REST client
const discordRest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN || '');

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const required = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_GUILD_ID',
    'DISCORD_ROLE_ID',
    'DB_USER',
    'DB_HOST',
    'DB_NAME',
    'DB_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function getAllOnSiteCampersDiscordAccounts(): Promise<DiscordAccount[]> {
  return new Promise((resolve, reject) => {
    const campers: DiscordAccount[] = [];
    discordRest.get(Routes.guild(DISCORD_GUILD_ID || '')).then((guild: any) => {
      const members = guild.members;
      members.forEach((member: any) => {
        if (member.roles.includes(DISCORD_ROLE_ID)) {
        campers.push({
          account_id: member.id,
          user_id: '',
          provider_id: 'discord'
        });
      }
      });
      resolve(campers);
    }).catch((error: any) => {
      reject(error);
    });
  });
}

/**
 * Read CSV file with Thai column names and return parsed data
 */
function readAcceptedCampersCSV(filePath: string): Promise<ProcessedCamper[]> {
  return new Promise((resolve, reject) => {
    const campers: ProcessedCamper[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: CSVAcceptedCamper) => {
        // Extract and process data
        if (row['ชื่อจริง'] && row['นามสกุล']) {
          campers.push({
            fullName: row['รายชื่อ']?.trim() || '',
            prefix: row['คำนำหน้า']?.trim() || '',
            firstName: row['ชื่อจริง']?.trim() || '',
            lastName: row['นามสกุล']?.trim() || '',
            nickname: row['ชื่อเล่น']?.trim() || '',
            status: row['สถานะ']?.trim() || ''
          });
        }
      })
      .on('end', () => {
        console.log(`✅ CSV file processed. Found ${campers.length} accepted campers.`);
        resolve(campers);
      })
      .on('error', (error: Error) => {
        reject(error);
      });
  });
}

/**
 * Get user_id from onsite_personal_data table by matching name
 */
async function getUserIdFromPersonalData(
  firstName: string,
  lastName: string,
  prefix?: string
): Promise<string | null> {
  try {
    let query = `
      SELECT user_id, first_name, sur_name 
      FROM onsite_personal_data 
      WHERE first_name = $1 AND sur_name = $2
    `;
    const params: string[] = [firstName, lastName];

    // // Optionally filter by prefix if provided
    // if (prefix) {
    //   query += ' AND prefix = $3';
    //   params.push(prefix);
    // }

    query += ' LIMIT 1';

    const result = await pool.query<DatabaseUser>(query, params);
    
    if (result.rows.length > 0 && result.rows[0]) {
      return result.rows[0].user_id;
    }
    
    return null;
  } catch (error) {
    console.error(
      `❌ Error fetching user_id for ${firstName} ${lastName}:`,
      (error as Error).message
    );
    return null;
  }
}

/**
 * Get Discord account_id from account table
 */
async function getDiscordAccountId(userId: string): Promise<string | null> {
  try {
    const query = `
      SELECT account_id, user_id, provider_id 
      FROM account 
      WHERE user_id = $1 AND provider_id = 'discord'
      LIMIT 1
    `;
    
    const result = await pool.query<DiscordAccount>(query, [userId]);
    
    if (result.rows.length > 0 && result.rows[0]) {
      return result.rows[0].account_id;
    }
    
    return null;
  } catch (error) {
    console.error(
      `❌ Error fetching Discord account for user_id ${userId}:`,
      (error as Error).message
    );
    return null;
  }
}

/**
 * Assign Discord role to a user via REST API
 */
async function assignDiscordRole(
  discordUserId: string,
  guildId: string,
  roleId: string
): Promise<boolean> {
  try {
    await discordRest.put(
      Routes.guildMemberRole(guildId, discordUserId, roleId),
      { reason: 'Accepted camper - onsite round' }
    );
    
    return true;
  } catch (error) {
    const err = error as any;
    console.error(
      `❌ Failed to assign role to Discord user ${discordUserId}:`,
      err.message || error
    );
    return false;
  }
}

/**
 * Add a delay between API calls to avoid rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process all accepted campers and assign Discord roles
 */
async function processAcceptedCampers(csvFilePath: string): Promise<void> {
  try {
    // Validate environment variables
    validateEnvironment();

    // Verify CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Test Discord API connection
    try {
      if (!DISCORD_GUILD_ID) {
        throw new Error('DISCORD_GUILD_ID is not set');
      }
      await discordRest.get(Routes.guild(DISCORD_GUILD_ID));
      console.log('✅ Discord API connection successful');
    } catch (error) {
      throw new Error('Failed to connect to Discord API. Check your bot token and permissions.');
    }

    // Read CSV data
    const campers = await readAcceptedCampersCSV(csvFilePath);
    
    if (campers.length === 0) {
      console.log('⚠️  No valid campers found in CSV file');
      return;
    }

    const result: ProcessingResult = {
      total: campers.length,
      foundInDatabase: 0,
      discordAccountsFound: 0,
      rolesAssigned: 0,
      errors: 0,
      failedCampers: []
    };

    console.log('\n📋 Starting to process campers...\n');

    for (let i = 0; i < campers.length; i++) {
      const camper = campers[i];
      if (!camper) continue;
      
      const progress = `[${i + 1}/${campers.length}]`;
      
      console.log(`${progress} Processing: ${camper.firstName} ${camper.lastName} (${camper.nickname})`);

      // Step 1: Get user_id from onsite_personal_data
      const userId = await getUserIdFromPersonalData(
        camper.firstName,
        camper.lastName,
        camper.prefix
      );

      if (!userId) {
        console.log(`  ⚠️  User not found in onsite_personal_data table`);
        result.errors++;
        result.failedCampers.push({
          name: `${camper.firstName} ${camper.lastName}`,
          reason: 'Not found in onsite_personal_data table'
        });
        continue;
      }

      console.log(`  ✓ Found user_id: ${userId}`);
      result.foundInDatabase++;

      // Step 2: Get Discord account_id from account table
      const discordAccountId = await getDiscordAccountId(userId);

      if (!discordAccountId) {
        console.log(`  ⚠️  Discord account not linked`);
        result.errors++;
        result.failedCampers.push({
          name: `${camper.firstName} ${camper.lastName}`,
          reason: 'Discord account not linked'
        });
        continue;
      }

      console.log(`  ✓ Found Discord ID: ${discordAccountId}`);
      result.discordAccountsFound++;

      // Step 3: Assign Discord role via REST API
      if (!DISCORD_GUILD_ID || !DISCORD_ROLE_ID) {
        throw new Error('DISCORD_GUILD_ID or DISCORD_ROLE_ID is not set');
      }

      const roleAssigned = await assignDiscordRole(
        discordAccountId,
        DISCORD_GUILD_ID,
        DISCORD_ROLE_ID
      );

      if (roleAssigned) {
        console.log(`  ✅ Role assigned successfully!`);
        result.rolesAssigned++;
      } else {
        console.log(`  ❌ Failed to assign role`);
        result.errors++;
        result.failedCampers.push({
          name: `${camper.firstName} ${camper.lastName}`,
          reason: 'Failed to assign Discord role (API error)'
        });
      }

      // Add delay to avoid rate limiting (Discord allows ~50 requests per second)
      if (i < campers.length - 1) {
        await delay(100); // 100ms delay between requests
      }

      console.log('');
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PROCESSING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total campers in CSV:        ${result.total}`);
    console.log(`Found in database:           ${result.foundInDatabase}`);
    console.log(`Discord accounts found:      ${result.discordAccountsFound}`);
    console.log(`✅ Roles assigned:           ${result.rolesAssigned}`);
    console.log(`❌ Errors:                   ${result.errors}`);
    console.log(`Success rate:                ${((result.rolesAssigned / result.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (result.failedCampers.length > 0) {
      console.log('\n⚠️  FAILED CAMPERS:');
      console.log('='.repeat(60));
      result.failedCampers.forEach((failed, idx) => {
        console.log(`${idx + 1}. ${failed.name}`);
        console.log(`   Reason: ${failed.reason}`);
      });
      console.log('='.repeat(60));
    }

  } catch (error) {
    console.error('\n❌ Error processing campers:', (error as Error).message);
    throw error;
  } finally {
    // Close database connection
    await pool.end();
    console.log('\n✅ Database connection closed');
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const csvFilePath = process.argv[2] || 'for MC Tool.csv';
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DISCORD ROLE ASSIGNER - Accepted Campers');
  console.log('='.repeat(60));
  console.log(`📄 CSV File:     ${csvFilePath}`);
  console.log(`🗄️  Database:     ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`🤖 Discord Bot:  ${DISCORD_BOT_TOKEN ? '✓ Token loaded' : '✗ No token'}`);
  console.log(`🏰 Guild ID:     ${DISCORD_GUILD_ID || 'Not set'}`);
  console.log(`🎭 Role ID:      ${DISCORD_ROLE_ID || 'Not set'}`);
  console.log('='.repeat(60) + '\n');

  await processAcceptedCampers(csvFilePath);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  readAcceptedCampersCSV,
  getUserIdFromPersonalData,
  getDiscordAccountId,
  assignDiscordRole,
  processAcceptedCampers
};

