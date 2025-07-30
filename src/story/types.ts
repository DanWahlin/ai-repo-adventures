export interface Character {
  name: string;
  role: string;
  description: string;
  greeting: string;
  funFact: string;
  technology: string;
}

export interface Story {
  theme: string;
  title: string;
  introduction: string;
  setting: string;
  characters: Character[];
  initialChoices: string[];
}