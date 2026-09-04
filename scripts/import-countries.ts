import { PrismaClient } from "@prisma/client";
import { translateCountry } from "@/lib/constants/country-translations";
import { NATIONAL_TEAMS_CONFIG, getNationalTeamFlagUrl } from "@/lib/constants/national-teams";
import { fetchEARatingsPayload } from "@/lib/ea/ratings-client";

const prisma = new PrismaClient();

interface EANationality {
  id: number;
  label: string;
  imageUrl: string;
  isPopular: boolean;
}

async function fetchEANationalities(): Promise<EANationality[]> {
  console.log("📥 Fetching EA nationalities...");
  const data = await fetchEARatingsPayload<{
    pageProps?: { auxData?: { defaultLocaleFilters?: { nationality?: EANationality[] } } };
  }>();
  const nationalities = data.pageProps?.auxData?.defaultLocaleFilters?.nationality ?? [];
  console.log(`  Found ${nationalities.length} nationalities`);
  return nationalities;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

async function main() {
  console.log("🌍 Importing Countries & NationalTeams...");
  
  const nationalities = await fetchEANationalities();
  
  let countriesCreated = 0;
  let nationalTeamsCreated = 0;

  for (const nat of nationalities) {
    const eaId = String(nat.id);
    const nameEN = nat.label;
    const nameES = translateCountry(nameEN);
    const flagUrl = nat.imageUrl;
    
    const countryCodeMap: Record<string, string> = {
      "Spain": "ES", "France": "FR", "Germany": "DE", "Italy": "IT", "England": "GB",
      "Netherlands": "NL", "Belgium": "BE", "Portugal": "PT", "Ireland": "IE", "Scotland": "GB",
      "Denmark": "DK", "Austria": "AT", "Norway": "NO", "Sweden": "SE", "Switzerland": "CH",
      "Turkey": "TR", "Poland": "PL", "Romania": "RO", "Czech Republic": "CZ",
      "Australia": "AU", "South Korea": "KR", "Saudi Arabia": "SA", "USA": "US",
      "Argentina": "AR", "Mexico": "MX", "Colombia": "CO", "Croatia": "HR",
      "Finland": "FI", "Hungary": "HU", "Azerbaijan": "AZ", "Chile": "CL",
      "Greece": "GR", "Cyprus": "CY", "Thailand": "TH", "Bulgaria": "BG",
      "India": "IN", "UAE": "AE",
    };
    const countryCode = countryCodeMap[nameEN] ?? null;

    await prisma.country.upsert({
      where: { eaId },
      update: { name: nameES, flagUrl, normalizedName: normalizeName(nameES), ...(countryCode ? { code: countryCode } : {}) },
      create: { eaId, name: nameES, flagUrl, normalizedName: normalizeName(nameES), ...(countryCode ? { code: countryCode } : {}) },
    });
    countriesCreated++;
  }

  for (const ntConfig of NATIONAL_TEAMS_CONFIG) {
    const eaId = ntConfig.eaId;
    const nameES = ntConfig.nameES;
    const shortName = ntConfig.shortName;
    const countryCode = ntConfig.countryCode;
    const flagUrl = getNationalTeamFlagUrl(ntConfig.flagId);

    await prisma.nationalTeam.upsert({
      where: { eaId },
      update: { name: nameES, shortName, flagUrl, countryCode, normalizedName: normalizeName(nameES), country: nameES },
      create: { eaId, name: nameES, shortName, flagUrl, countryCode, normalizedName: normalizeName(nameES), country: nameES },
    });
    nationalTeamsCreated++;
  }

  console.log(`✅ Created ${countriesCreated} Countries`);
  console.log(`✅ Created ${nationalTeamsCreated} NationalTeams`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Import failed:", e);
  process.exit(1);
});