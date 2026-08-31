export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
}

export interface PersonalData {
  userId: string;
  title: string;
  firstName: string;
  surName: string;
  nickName: string;
  phone: string;
  birthday: string;
  region: string;
  image: string;
  studyPlan: string;
  grade: string;
  school: string;
  facebookUrl: string;
  instagramUrl: string;
  discordId: string;
}

export interface PersonalDataResponse {
  nickName: string,
  firstName: string,
  grade: string,
  region: string,
}
