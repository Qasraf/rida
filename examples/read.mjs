import { RidaReader } from "rida-format";

const reader = await RidaReader.open("./ExampleData.rida");
try {
  console.log(await reader.get("backpack-2812", "hindi"));
  console.log(await reader.getMany("backpack-2812", ["price", "hindi"]));
  console.log(await reader.getRecord("desk-3812"));
} finally {
  await reader.close();
}
