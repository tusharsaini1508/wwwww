import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Card } from "../../../src/components/Card";
import { AccessDenied } from "../../../src/components/AccessDenied";
import { AdminTabs } from "../../../src/components/AdminTabs";
import { FormField } from "../../../src/components/FormField";
import { Button } from "../../../src/components/Button";
import { theme } from "../../../src/theme";
import { useAppStore } from "../../../src/store/useAppStore";
import { Bin, Location, Warehouse } from "../../../src/types";
import { useCan } from "../../../src/hooks/useCurrentUser";

const WarehouseEditor = ({
  warehouse,
  onUpdate
}: {
  warehouse: Warehouse;
  onUpdate: (patch: Partial<Warehouse>) => void;
}) => {
  const [name, setName] = useState(warehouse.name);

  useEffect(() => {
    setName(warehouse.name);
  }, [warehouse.name]);

  const hasChanges = name.trim() && name.trim() !== warehouse.name;

  return (
    <Card>
      <FormField label="Warehouse name">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Warehouse name"
          placeholderTextColor={theme.colors.inkSoft}
          style={styles.input}
        />
      </FormField>
      <View style={styles.actionRow}>
        <Button
          label="Save"
          size="sm"
          onPress={() => onUpdate({ name: name.trim() })}
          disabled={!hasChanges}
        />
      </View>
    </Card>
  );
};

const LocationEditor = ({
  location,
  warehouses,
  onUpdate
}: {
  location: Location;
  warehouses: Warehouse[];
  onUpdate: (patch: Partial<Location>) => void;
}) => {
  const [zone, setZone] = useState(location.zone);
  const [warehouseId, setWarehouseId] = useState(location.warehouseId);
  const [rackNumber, setRackNumber] = useState(location.rackNumber ?? "");

  useEffect(() => {
    setZone(location.zone);
    setWarehouseId(location.warehouseId);
    setRackNumber(location.rackNumber ?? "");
  }, [location.rackNumber, location.warehouseId, location.zone]);

  const hasChanges =
    zone.trim() !== location.zone ||
    warehouseId !== location.warehouseId ||
    rackNumber.trim() !== (location.rackNumber ?? "");

  return (
    <Card>
      <Text style={styles.label}>Warehouse</Text>
      <View style={styles.chipRow}>
        {warehouses.map((warehouse) => {
          const active = warehouse.id === warehouseId;
          return (
            <Pressable
              key={warehouse.id}
              onPress={() => setWarehouseId(warehouse.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {warehouse.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FormField label="Zone">
        <TextInput
          value={zone}
          onChangeText={setZone}
          placeholder="Zone"
          placeholderTextColor={theme.colors.inkSoft}
          style={styles.input}
        />
      </FormField>
      <FormField label="Rack number">
        <TextInput
          value={rackNumber}
          onChangeText={setRackNumber}
          placeholder="Rack number"
          placeholderTextColor={theme.colors.inkSoft}
          style={styles.input}
        />
      </FormField>
      <View style={styles.actionRow}>
        <Button
          label="Save"
          size="sm"
          onPress={() =>
            onUpdate({
              zone: zone.trim(),
              warehouseId,
              rackNumber: rackNumber.trim()
            })
          }
          disabled={!hasChanges || !zone.trim() || !warehouseId}
        />
      </View>
    </Card>
  );
};

const BinEditor = ({
  bin,
  locations,
  onUpdate
}: {
  bin: Bin;
  locations: Location[];
  onUpdate: (patch: Partial<Bin>) => void;
}) => {
  const [code, setCode] = useState(bin.code);
  const [capacity, setCapacity] = useState(String(bin.capacity));
  const [locationId, setLocationId] = useState(bin.locationId);
  const [binNumber, setBinNumber] = useState(bin.binNumber ?? "");

  useEffect(() => {
    setCode(bin.code);
    setCapacity(String(bin.capacity));
    setLocationId(bin.locationId);
    setBinNumber(bin.binNumber ?? "");
  }, [bin.binNumber, bin.code, bin.capacity, bin.locationId]);

  const hasChanges =
    code.trim() !== bin.code ||
    Number(capacity) !== bin.capacity ||
    locationId !== bin.locationId ||
    binNumber.trim() !== (bin.binNumber ?? "");

  return (
    <Card>
      <Text style={styles.label}>Location</Text>
      <View style={styles.chipRow}>
        {locations.map((location) => {
          const active = location.id === locationId;
          return (
            <Pressable
              key={location.id}
              onPress={() => setLocationId(location.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {location.zone}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.inputGrid}>
        <FormField label="Bin code" style={styles.field}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Bin code"
            placeholderTextColor={theme.colors.inkSoft}
            style={styles.input}
          />
        </FormField>
        <FormField label="Bin number" style={styles.field}>
          <TextInput
            value={binNumber}
            onChangeText={setBinNumber}
            placeholder="Bin number"
            placeholderTextColor={theme.colors.inkSoft}
            style={styles.input}
          />
        </FormField>
        <FormField label="Capacity" style={styles.field}>
          <TextInput
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.colors.inkSoft}
            style={styles.input}
          />
        </FormField>
      </View>
      <View style={styles.actionRow}>
        <Button
          label="Save"
          size="sm"
          onPress={() =>
            onUpdate({
              code: code.trim(),
              capacity: Number.isNaN(Number(capacity)) ? 0 : Number(capacity),
              locationId,
              binNumber: binNumber.trim()
            })
          }
          disabled={!hasChanges || !code.trim() || !locationId}
        />
      </View>
    </Card>
  );
};

export default function FacilityScreen() {
  const canEdit = useCan("warehouse.edit");
  const warehouses = useAppStore((state) => state.warehouses);
  const locations = useAppStore((state) => state.locations);
  const bins = useAppStore((state) => state.bins);
  const createWarehouse = useAppStore((state) => state.createWarehouse);
  const updateWarehouse = useAppStore((state) => state.updateWarehouse);
  const createLocation = useAppStore((state) => state.createLocation);
  const updateLocation = useAppStore((state) => state.updateLocation);
  const createBin = useAppStore((state) => state.createBin);
  const updateBin = useAppStore((state) => state.updateBin);

  const [warehouseName, setWarehouseName] = useState("");
  const [locationZone, setLocationZone] = useState("");
  const [locationWarehouseId, setLocationWarehouseId] = useState("");
  const [locationRackNumber, setLocationRackNumber] = useState("");
  const [binCode, setBinCode] = useState("");
  const [binCapacity, setBinCapacity] = useState("0");
  const [binLocationId, setBinLocationId] = useState("");
  const [binNumber, setBinNumber] = useState("");

  useEffect(() => {
    if (!locationWarehouseId && warehouses[0]) {
      setLocationWarehouseId(warehouses[0].id);
    }
  }, [locationWarehouseId, warehouses]);

  useEffect(() => {
    if (!binLocationId && locations[0]) {
      setBinLocationId(locations[0].id);
    }
  }, [binLocationId, locations]);

  if (!canEdit) {
    return (
      <Screen>
        <SectionHeader title="Facility Setup" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <SectionHeader
        title="Facility Setup"
        subtitle="Define warehouses, locations, and bin capacity."
      />
      <AdminTabs />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Add warehouse</Text>
          <FormField label="Warehouse name">
            <TextInput
              value={warehouseName}
              onChangeText={setWarehouseName}
              placeholder="Warehouse name"
              placeholderTextColor={theme.colors.inkSoft}
              style={styles.input}
            />
          </FormField>
          <Button
            label="Create warehouse"
            onPress={() => {
              if (!warehouseName.trim()) {
                return;
              }
              createWarehouse({ name: warehouseName.trim() });
              setWarehouseName("");
            }}
            disabled={!warehouseName.trim()}
          />
        </Card>

        <View style={styles.stack}>
          {warehouses.length === 0 ? (
            <Card>
              <Text style={styles.mutedText}>No warehouses yet.</Text>
            </Card>
          ) : (
            warehouses.map((warehouse) => (
              <WarehouseEditor
                key={warehouse.id}
                warehouse={warehouse}
                onUpdate={(patch) => updateWarehouse(warehouse.id, patch)}
              />
            ))
          )}
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Add location</Text>
          {warehouses.length === 0 ? (
            <Text style={styles.mutedText}>Create a warehouse first.</Text>
          ) : (
            <>
              <Text style={styles.label}>Warehouse</Text>
              <View style={styles.chipRow}>
                {warehouses.map((warehouse) => {
                  const active = warehouse.id === locationWarehouseId;
                  return (
                    <Pressable
                      key={warehouse.id}
                      onPress={() => setLocationWarehouseId(warehouse.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {warehouse.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <FormField label="Zone">
                <TextInput
                  value={locationZone}
                  onChangeText={setLocationZone}
                  placeholder="Zone"
                  placeholderTextColor={theme.colors.inkSoft}
                  style={styles.input}
                />
              </FormField>
              <FormField label="Rack number">
                <TextInput
                  value={locationRackNumber}
                  onChangeText={setLocationRackNumber}
                  placeholder="Rack number"
                  placeholderTextColor={theme.colors.inkSoft}
                  style={styles.input}
                />
              </FormField>
              <Button
                label="Create location"
                onPress={() => {
                  if (!locationZone.trim() || !locationWarehouseId) {
                    return;
                  }
                  createLocation({
                    warehouseId: locationWarehouseId,
                    zone: locationZone.trim(),
                    rackNumber: locationRackNumber.trim()
                  });
                  setLocationZone("");
                  setLocationRackNumber("");
                }}
                disabled={!locationZone.trim() || !locationWarehouseId}
              />
            </>
          )}
        </Card>

        <View style={styles.stack}>
          {locations.length === 0 ? (
            <Card>
              <Text style={styles.mutedText}>No locations yet.</Text>
            </Card>
          ) : (
            locations.map((location) => (
              <LocationEditor
                key={location.id}
                location={location}
                warehouses={warehouses}
                onUpdate={(patch) => updateLocation(location.id, patch)}
              />
            ))
          )}
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Add bin</Text>
          {locations.length === 0 ? (
            <Text style={styles.mutedText}>Create a location first.</Text>
          ) : (
            <>
              <Text style={styles.label}>Location</Text>
              <View style={styles.chipRow}>
                {locations.map((location) => {
                  const active = location.id === binLocationId;
                  return (
                    <Pressable
                      key={location.id}
                      onPress={() => setBinLocationId(location.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {location.zone}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.inputGrid}>
                <FormField label="Bin code" style={styles.field}>
                  <TextInput
                    value={binCode}
                    onChangeText={setBinCode}
                    placeholder="Bin code"
                    placeholderTextColor={theme.colors.inkSoft}
                    style={styles.input}
                  />
                </FormField>
                <FormField label="Bin number" style={styles.field}>
                  <TextInput
                    value={binNumber}
                    onChangeText={setBinNumber}
                    placeholder="Bin number"
                    placeholderTextColor={theme.colors.inkSoft}
                    style={styles.input}
                  />
                </FormField>
                <FormField label="Capacity" style={styles.field}>
                  <TextInput
                    value={binCapacity}
                    onChangeText={setBinCapacity}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.colors.inkSoft}
                    style={styles.input}
                  />
                </FormField>
              </View>
              <Button
                label="Create bin"
                onPress={() => {
                  const capacity = Number(binCapacity);
                  if (!binCode.trim() || !binLocationId || Number.isNaN(capacity)) {
                    return;
                  }
                  createBin({
                    locationId: binLocationId,
                    code: binCode.trim(),
                    capacity,
                    binNumber: binNumber.trim()
                  });
                  setBinCode("");
                  setBinCapacity("0");
                  setBinNumber("");
                }}
                disabled={!binCode.trim() || !binLocationId}
              />
            </>
          )}
        </Card>

        <View style={styles.stack}>
          {bins.length === 0 ? (
            <Card>
              <Text style={styles.mutedText}>No bins yet.</Text>
            </Card>
          ) : (
            bins.map((bin) => (
              <BinEditor
                key={bin.id}
                bin={bin}
                locations={locations}
                onUpdate={(patch) => updateBin(bin.id, patch)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: theme.spacing.xxl
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.inkSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    backgroundColor: theme.colors.surface
  },
  stack: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  chipActive: {
    borderColor: theme.colors.accentDark,
    backgroundColor: theme.colors.accentSoft
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  },
  chipTextActive: {
    color: theme.colors.accentDark,
    fontWeight: "700"
  },
  inputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  field: {
    flex: 1,
    minWidth: 160
  },
  actionRow: {
    marginTop: theme.spacing.sm,
    alignItems: "flex-start"
  },
  mutedText: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  }
});
