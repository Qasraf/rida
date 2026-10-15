import rida

with rida.RidaFile("ExampleData.rida") as data:
    print(data.get("backpack-2812", "hindi"))
    print(data.get_many("backpack-2812", ["price", "hindi"]))
    print(data.get_record("desk-3812"))
