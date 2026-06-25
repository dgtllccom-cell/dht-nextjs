export type WarehouseRecord = {
  id: string;
  warehouse_name: string;
  owner_name: string;
  warehouse_type: string;
  country_id: string | null;
  state_province_id: string | null;
  district_id: string | null;
  city_id: string | null;
  full_address: string | null;
  contact_number: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

// Mock database
let mockWarehouses: WarehouseRecord[] = [
  {
    id: "wh-1",
    warehouse_name: "MAIN WH-A",
    owner_name: "Damaan Group",
    warehouse_type: "Normal Storage",
    country_id: "AE",
    state_province_id: "DU",
    district_id: null,
    city_id: null,
    full_address: "Jebel Ali Free Zone, Dubai",
    contact_number: "+971 4 123 4567",
    status: "Active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export async function fetchWarehouses(): Promise<WarehouseRecord[]> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return [...mockWarehouses];
}

export async function createWarehouse(data: Omit<WarehouseRecord, "id" | "created_at" | "updated_at">): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const newId = `wh-${Date.now()}`;
  const newRecord: WarehouseRecord = {
    ...data,
    id: newId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockWarehouses.push(newRecord);
  return newId;
}
