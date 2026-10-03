/**
 * Launch-campus configuration.
 *
 * UniVerse is going live at these five campuses first. Students who sign up
 * (from anywhere) are told a launch is coming and offered the waitlist.
 * Names MUST match schools.name exactly — the signup trigger canonicalizes
 * to these strings.
 */
export const WAITLIST_URL = "https://waitlist.universeicos.app/";

export interface LaunchSchool {
  /** Exact schools.name value in the database */
  name: string;
  /** Friendly display label used in UI copy */
  label: string;
}

export const LAUNCH_SCHOOLS: LaunchSchool[] = [
  {
    name: "University of Agriculture and Environmental Sciences, Umagwo",
    label: "University of Agriculture & Environmental Sciences (UAES)",
  },
  {
    name: "Alex Ekwueme Federal University Ndufu-Alike",
    label: "Alex Ekwueme Federal University Ndufu-Alike (FUNAI)",
  },
  {
    name: "Federal University of Technology Owerri",
    label: "Federal University of Technology, Owerri (FUTO)",
  },
  {
    name: "Michael Okpara University of Agriculture, Umudike",
    label: "Michael Okpara University of Agriculture, Umudike (MOUAU)",
  },
  {
    name: "University of Nigeria, Nsukka",
    label: "University of Nigeria, Nsukka (UNN)",
  },
];

/** Returns the launch school entry when the given campus is a launch campus. */
export function findLaunchSchool(university: string | null | undefined): LaunchSchool | null {
  if (!university) return null;
  return LAUNCH_SCHOOLS.find((s) => s.name === university) ?? null;
}

/** True when the student's campus is one of the five launch campuses. */
export function isLaunchCampus(university: string | null | undefined): boolean {
  return findLaunchSchool(university) !== null;
}
