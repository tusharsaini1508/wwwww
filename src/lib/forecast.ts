import { BOMLine, Item, InventoryBalance } from "../types";

export type ForecastResult = {
  productId: string;
  productName: string;
  maxUnits: number;
  bottleneckMaterialId: string | null;
  bottleneckMaterialName: string | null;
  warnings: string[];
};

type MaterialAvailability = {
  available: number;
  name: string;
  reorderPoint: number;
  safetyStock: number;
  yieldPercent: number;
  scrapPercent: number;
};

const roundDown = (value: number) => Math.max(0, Math.floor(value));

export const calculateForecast = (
  items: Item[],
  bomLines: BOMLine[],
  inventory: InventoryBalance[]
): ForecastResult[] => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const availabilityMap = new Map<string, MaterialAvailability>();

  inventory.forEach((balance) => {
    const item = itemMap.get(balance.itemId);
    if (!item || item.type !== "material") {
      return;
    }
    const current = availabilityMap.get(item.id);
    const availableQty = Math.max(0, balance.onHand - balance.reserved);
    const base: MaterialAvailability = current ?? {
      available: 0,
      name: item.name,
      reorderPoint: item.reorderPoint,
      safetyStock: item.safetyStock,
      yieldPercent: item.yieldPercent,
      scrapPercent: item.scrapPercent
    };
    base.available += availableQty;
    availabilityMap.set(item.id, base);
  });

  const products = items.filter((item) => item.type === "finished");
  return products.map((product) => {
    const lines = bomLines.filter(
      (line) => line.finishedProductId === product.id
    );

    if (lines.length === 0) {
      return {
        productId: product.id,
        productName: product.name,
        maxUnits: 0,
        bottleneckMaterialId: null,
        bottleneckMaterialName: null,
        warnings: ["Missing BOM lines"]
      };
    }

    let bottleneckMaterialId: string | null = null;
    let bottleneckMaterialName: string | null = null;
    let minUnits = Number.POSITIVE_INFINITY;
    const warnings: string[] = [];

    lines.forEach((line) => {
      const material = itemMap.get(line.materialId);
      if (!material) {
        warnings.push(`Material missing: ${line.materialId}`);
        minUnits = 0;
        return;
      }
      const availability =
        availabilityMap.get(line.materialId) ?? {
          available: 0,
          name: material.name,
          reorderPoint: material.reorderPoint,
          safetyStock: material.safetyStock,
          yieldPercent: material.yieldPercent,
          scrapPercent: material.scrapPercent
        };
      if (!availabilityMap.has(line.materialId)) {
        warnings.push(`${material.name} has no inventory records.`);
      }

      if (line.qtyPerUnit <= 0) {
        warnings.push(`Invalid BOM quantity for ${material.name}`);
        minUnits = 0;
        return;
      }

      const yieldFactor = Math.max(0, availability.yieldPercent) / 100;
      const scrapFactor = Math.max(0, 1 - availability.scrapPercent / 100);
      const usableQty = availability.available * yieldFactor * scrapFactor;
      const possibleUnits = usableQty / line.qtyPerUnit;

      if (possibleUnits < minUnits) {
        minUnits = possibleUnits;
        bottleneckMaterialId = material.id;
        bottleneckMaterialName = material.name;
      }

      if (availability.available < availability.reorderPoint) {
        const suggestion = Math.max(
          0,
          availability.reorderPoint * 2 - availability.available
        );
        warnings.push(
          `${material.name} below reorder point. Suggest PO ${roundDown(
            suggestion
          )} ${material.uom}.`
        );
      }

      if (availability.available < availability.safetyStock) {
        warnings.push(`${material.name} below safety stock.`);
      }
    });

    const maxUnits = minUnits === Number.POSITIVE_INFINITY ? 0 : roundDown(minUnits);
    return {
      productId: product.id,
      productName: product.name,
      maxUnits,
      bottleneckMaterialId,
      bottleneckMaterialName,
      warnings
    };
  });
};
