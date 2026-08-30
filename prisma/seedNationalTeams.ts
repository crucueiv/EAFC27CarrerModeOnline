import { loadLocalEnvironment } from "../src/lib/config/env";
loadLocalEnvironment();
import { PrismaClient } from "@prisma/client";
import { normalizeSearchText } from "../src/lib/search/normalize";

const prisma = new PrismaClient();

function shortName(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim().slice(0, 3).toUpperCase() || "NAT";
}

const MANUAL_NATIONAL_TEAMS: Array<{
  name: string;
  country: string;
  countryCode: string;
  flagUrl?: string;
}> = [
  { name: "Argentina", country: "Argentina", countryCode: "AR", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg" },
  { name: "Brasil", country: "Brazil", countryCode: "BR", flagUrl: "https://upload.wikimedia.org/wikipedia/en/0/05/Flag_of_Brazil.svg" },
  { name: "España", country: "Spain", countryCode: "ES", flagUrl: "https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg" },
  { name: "Francia", country: "France", countryCode: "FR", flagUrl: "https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg" },
  { name: "Alemania", country: "Germany", countryCode: "DE", flagUrl: "https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg" },
  { name: "Inglaterra", country: "England", countryCode: "GB-ENG", flagUrl: "https://upload.wikimedia.org/wikipedia/en/b/be/Flag_of_England.svg" },
  { name: "Italia", country: "Italy", countryCode: "IT", flagUrl: "https://upload.wikimedia.org/wikipedia/en/0/03/Flag_of_Italy.svg" },
  { name: "Portugal", country: "Portugal", countryCode: "PT", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Portugal.svg" },
  { name: "Países Bajos", country: "Netherlands", countryCode: "NL", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/2/20/Flag_of_the_Netherlands.svg" },
  { name: "Bélgica", country: "Belgium", countryCode: "BE", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Belgium.svg" },
  { name: "Croacia", country: "Croatia", countryCode: "HR", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Flag_of_Croatia.svg" },
  { name: "Uruguay", country: "Uruguay", countryCode: "UY", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Uruguay.svg" },
  { name: "Colombia", country: "Colombia", countryCode: "CO", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Colombia.svg" },
  { name: "México", country: "Mexico", countryCode: "MX", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Flag_of_Mexico.svg" },
  { name: "Senegal", country: "Senegal", countryCode: "SN", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Flag_of_Senegal.svg" },
  { name: "Marruecos", country: "Morocco", countryCode: "MA", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Morocco.svg" },
  { name: "Japón", country: "Japan", countryCode: "JP", flagUrl: "https://upload.wikimedia.org/wikipedia/en/9/9e/Flag_of_Japan.svg" },
  { name: "Estados Unidos", country: "USA", countryCode: "US", flagUrl: "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg" },
  { name: "Corea del Sur", country: "South Korea", countryCode: "KR", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg" },
  { name: "Polonia", country: "Poland", countryCode: "PL", flagUrl: "https://upload.wikimedia.org/wikipedia/en/1/12/Flag_of_Poland.svg" },
  { name: "Suecia", country: "Sweden", countryCode: "SE", flagUrl: "https://upload.wikimedia.org/wikipedia/en/4/4c/Flag_of_Sweden.svg" },
  { name: "Dinamarca", country: "Denmark", countryCode: "DK", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Flag_of_Denmark.svg" },
  { name: "Suiza", country: "Switzerland", countryCode: "CH", flagUrl: "https://upload.wikimedia.org/wikipedia/en/0/08/Flag_of_Switzerland.svg" },
  { name: "Serbia", country: "Serbia", countryCode: "RS", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Flag_of_Serbia.svg" },
  { name: "Gales", country: "Wales", countryCode: "GB-WLS", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Flag_of_Wales.svg" },
  { name: "Escocia", country: "Scotland", countryCode: "GB-SCT", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Scotland.svg" },
  { name: "Noruega", country: "Norway", countryCode: "NO", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Norway.svg" },
  { name: "Finlandia", country: "Finland", countryCode: "FI", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Finland.svg" },
  { name: "Grecia", country: "Greece", countryCode: "GR", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Greece.svg" },
  { name: "Rusia", country: "Russia", countryCode: "RU", flagUrl: "https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg" },
  { name: "Ecuador", country: "Ecuador", countryCode: "EC", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Flag_of_Ecuador.svg" },
  { name: "Chile", country: "Chile", countryCode: "CL", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/7/78/Flag_of_Chile.svg" },
  { name: "Paraguay", country: "Paraguay", countryCode: "PY", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/2/27/Flag_of_Paraguay.svg" },
  { name: "Perú", country: "Peru", countryCode: "PE", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Peru.svg" },
  { name: "Australia", country: "Australia", countryCode: "AU", flagUrl: "https://upload.wikimedia.org/wikipedia/en/b/b9/Flag_of_Australia.svg" },
  { name: "Canadá", country: "Canada", countryCode: "CA", flagUrl: "https://upload.wikimedia.org/wikipedia/en/c/cf/Flag_of_Canada.svg" },
  { name: "Costa Rica", country: "Costa Rica", countryCode: "CR", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Flag_of_Costa_Rica.svg" },
  { name: "Jamaica", country: "Jamaica", countryCode: "JM", flagUrl: "https://upload.wikimedia.org/wikipedia/en/0/0a/Flag_of_Jamaica.svg" },
  { name: "Camerún", country: "Cameroon", countryCode: "CM", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Cameroon.svg" },
  { name: "Ghana", country: "Ghana", countryCode: "GH", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Ghana.svg" },
  { name: "Nigeria", country: "Nigeria", countryCode: "NG", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/7/79/Flag_of_Nigeria.svg" },
  { name: "Túnez", country: "Tunisia", countryCode: "TN", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Tunisia.svg" },
  { name: "Arabia Saudita", country: "Saudi Arabia", countryCode: "SA", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Flag_of_Saudi_Arabia.svg" },
  { name: "China", country: "China", countryCode: "CN", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Flag_of_China.svg" },
  { name: "Qatar", country: "Qatar", countryCode: "QA", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Qatar.svg" },
  { name: "Turquía", country: "Turkey", countryCode: "TR", flagUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg" },
];

async function main() {
  console.log("Seeding national teams...");

  let created = 0;
  let skipped = 0;

  for (const nt of MANUAL_NATIONAL_TEAMS) {
    const existing = await prisma.nationalTeam.findFirst({
      where: { OR: [{ countryCode: nt.countryCode }, { country: nt.country }] },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.nationalTeam.create({
      data: {
        name: nt.name,
        normalizedName: normalizeSearchText(nt.name),
        shortName: shortName(nt.name),
        country: nt.country,
        countryCode: nt.countryCode,
        flagUrl: nt.flagUrl,
        imageUrl: nt.flagUrl,
      },
    });
    created++;
  }

  console.log(`Done: ${created} created, ${skipped} skipped.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
