import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Card } from "../../../src/components/Card";
import { AccessDenied } from "../../../src/components/AccessDenied";
import { AdminTabs } from "../../../src/components/AdminTabs";
import { FormField } from "../../../src/components/FormField";
import { Button } from "../../../src/components/Button";
import { Tag } from "../../../src/components/Tag";
import { theme } from "../../../src/theme";
import { useAppStore } from "../../../src/store/useAppStore";
import {
  ContractDuration,
  ContractType,
  Supplier,
  SupplierOrigin
} from "../../../src/types";
import { useCan } from "../../../src/hooks/useCurrentUser";

const toNumber = (value: string) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const SupplierEditor = ({
  supplier,
  onUpdate
}: {
  supplier: Supplier;
  onUpdate: (patch: Partial<Supplier>) => void;
}) => {
  const [name, setName] = useState(supplier.name);
  const [code, setCode] = useState(supplier.code);
  const [address, setAddress] = useState(supplier.address);
  const [contactNumber, setContactNumber] = useState(supplier.contactNumber);
  const [email, setEmail] = useState(supplier.email);
  const [origin, setOrigin] = useState<SupplierOrigin>(supplier.origin);
  const [incoTerms, setIncoTerms] = useState(supplier.incoTerms);
  const [leadTime, setLeadTime] = useState(String(supplier.leadTimeDays));
  const [moq, setMoq] = useState(String(supplier.minimumOrderQuantity));
  const [purchasePrice, setPurchasePrice] = useState(String(supplier.purchaseUnitPrice));
  const [lastPrice, setLastPrice] = useState(String(supplier.lastPurchasePrice));
  const [contractType, setContractType] = useState<ContractType>(supplier.contractType);
  const [contractDuration, setContractDuration] = useState<ContractDuration>(
    supplier.contractDuration
  );
  const [active, setActive] = useState(supplier.active);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(supplier.name);
    setCode(supplier.code);
    setAddress(supplier.address);
    setContactNumber(supplier.contactNumber);
    setEmail(supplier.email);
    setOrigin(supplier.origin);
    setIncoTerms(supplier.incoTerms);
    setLeadTime(String(supplier.leadTimeDays));
    setMoq(String(supplier.minimumOrderQuantity));
    setPurchasePrice(String(supplier.purchaseUnitPrice));
    setLastPrice(String(supplier.lastPurchasePrice));
    setContractType(supplier.contractType);
    setContractDuration(supplier.contractDuration);
    setActive(supplier.active);
    setError("");
  }, [supplier]);

  const hasChanges =
    name.trim() !== supplier.name ||
    code.trim() !== supplier.code ||
    address.trim() !== supplier.address ||
    contactNumber.trim() !== supplier.contactNumber ||
    email.trim().toLowerCase() !== supplier.email.toLowerCase() ||
    origin !== supplier.origin ||
    incoTerms.trim() !== supplier.incoTerms ||
    toNumber(leadTime) !== supplier.leadTimeDays ||
    toNumber(moq) !== supplier.minimumOrderQuantity ||
    toNumber(purchasePrice) !== supplier.purchaseUnitPrice ||
    toNumber(lastPrice) !== supplier.lastPurchasePrice ||
    contractType !== supplier.contractType ||
    contractDuration !== supplier.contractDuration ||
    active !== supplier.active;

  return (
    <Card>
      <View style={styles.row}>
        <View>
          <Text style={styles.title}>{supplier.name}</Text>
          <Text style={styles.sub}>Code {supplier.code}</Text>
        </View>
        <Tag label={supplier.active ? "ACTIVE" : "INACTIVE"} tone="info" />
      </View>
      <View style={styles.formGrid}>
        <FormField label="Supplier name" style={styles.field}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Supplier name"
            placeholderTextColor={theme.colors.inkSoft}
            style={styles.input}
          />
        </FormField>
        <FormField label="Supplier code" style={styles.field}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="SUP-001"
            placeholderTextColor={theme.colors.inkSoft}
            style={styles.input}
          />
        </FormField>
        <FormField label="Supplier address" style={styles.field}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Address"
            placeholderTextColor={theme.colors.inkSoft}
            style={styles.input}
          />
        </FormField>
        <FormField label="Contact number" style={styles.field}>
          <TextInput
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="+91 90000 00000"
            placeholderTextColor={theme.colors.inkSoft}
            style={styles.input}
          />
        </FormField>
        <FormField label="Email ID" style={styles.field}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="supplier@company.com"
            placeholderTextColor={theme.colors.inkSoft}
            autoCapitalize="none"
            style={styles.input}
          />
        </FormField>
        <FormField label="Inco terms" style={styles.field}>
          <TextInput
            value={incoTerms}
            onChangeText={setIncoTerms}
            placeholder="FOB, CIF"
            placeholderTextColor={theme.colors.inkSoft}
            style={styles.input}
          />
        </FormField>
        <FormField label="Lead time (days)" style={styles.field}>
          <TextInput
            value={leadTime}
            onChangeText={setLeadTime}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        <FormField label="Minimum order qty (MOQ)" style={styles.field}>
          <TextInput
            value={moq}
            onChangeText={setMoq}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        <FormField label="Purchase unit price" style={styles.field}>
          <TextInput
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
        <FormField label="Last purchase price" style={styles.field}>
          <TextInput
            value={lastPrice}
            onChangeText={setLastPrice}
            keyboardType="numeric"
            style={styles.input}
          />
        </FormField>
      </View>

      <Text style={styles.label}>Origin</Text>
      <View style={styles.chipRow}>
        {(["local", "abroad"] as SupplierOrigin[]).map((value) => {
          const activeChip = origin === value;
          return (
            <Pressable
              key={value}
              onPress={() => setOrigin(value)}
              style={[styles.chip, activeChip && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>
                {value === "local" ? "Local" : "Abroad"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Contract type</Text>
      <View style={styles.chipRow}>
        {(["one_time", "blanket"] as ContractType[]).map((value) => {
          const activeChip = contractType === value;
          return (
            <Pressable
              key={value}
              onPress={() => setContractType(value)}
              style={[styles.chip, activeChip && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>
                {value === "one_time" ? "One time PO" : "Blanket PO"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Contract duration</Text>
      <View style={styles.chipRow}>
        {(["1_year", "2_year", "3_year"] as ContractDuration[]).map((value) => {
          const activeChip = contractDuration === value;
          return (
            <Pressable
              key={value}
              onPress={() => setContractDuration(value)}
              style={[styles.chip, activeChip && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>
                {value.replace("_", " ")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Status</Text>
      <View style={styles.chipRow}>
        {[true, false].map((value) => {
          const activeChip = active === value;
          return (
            <Pressable
              key={String(value)}
              onPress={() => setActive(value)}
              style={[styles.chip, activeChip && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>
                {value ? "Active" : "Inactive"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.actionRow}>
        <Button
          label="Save"
          size="sm"
          onPress={() => {
            if (!name.trim() || !code.trim()) {
              setError("Supplier name and code are required.");
              return;
            }
            const nextMoq = toNumber(moq);
            if (nextMoq <= 0) {
              setError("MOQ must be greater than 0.");
              return;
            }
            setError("");
            onUpdate({
              name: name.trim(),
              code: code.trim(),
              address: address.trim(),
              contactNumber: contactNumber.trim(),
              email: email.trim(),
              origin,
              incoTerms: incoTerms.trim(),
              leadTimeDays: toNumber(leadTime),
              minimumOrderQuantity: nextMoq,
              purchaseUnitPrice: toNumber(purchasePrice),
              lastPurchasePrice: toNumber(lastPrice),
              contractType,
              contractDuration,
              active
            });
          }}
          disabled={!hasChanges || !name.trim() || !code.trim()}
        />
      </View>
    </Card>
  );
};

export default function SuppliersScreen() {
  const canView = useCan("procurement.view");
  const suppliers = useAppStore((state) => state.suppliers);
  const createSupplier = useAppStore((state) => state.createSupplier);
  const updateSupplier = useAppStore((state) => state.updateSupplier);

  const [draftName, setDraftName] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [draftAddress, setDraftAddress] = useState("");
  const [draftContact, setDraftContact] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftOrigin, setDraftOrigin] = useState<SupplierOrigin>("local");
  const [draftInco, setDraftInco] = useState("");
  const [draftLeadTime, setDraftLeadTime] = useState("0");
  const [draftMoq, setDraftMoq] = useState("0");
  const [draftPurchasePrice, setDraftPurchasePrice] = useState("0");
  const [draftLastPrice, setDraftLastPrice] = useState("0");
  const [draftContractType, setDraftContractType] =
    useState<ContractType>("one_time");
  const [draftContractDuration, setDraftContractDuration] =
    useState<ContractDuration>("1_year");
  const [draftActive, setDraftActive] = useState(true);
  const [createError, setCreateError] = useState("");

  const supplierCodes = useMemo(
    () => new Set(suppliers.map((supplier) => supplier.code.toLowerCase())),
    [suppliers]
  );
  const codeExists = draftCode.trim()
    ? supplierCodes.has(draftCode.trim().toLowerCase())
    : false;

  if (!canView) {
    return (
      <Screen>
        <SectionHeader title="Supplier Master" subtitle="Role-based access enforced." />
        <AccessDenied />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <SectionHeader
        title="Supplier Master"
        subtitle="Capture vendor contacts, lead times, and contract details."
      />
      <AdminTabs />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Add supplier</Text>
          <View style={styles.formGrid}>
            <FormField label="Supplier name" style={styles.field}>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Supplier name"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </FormField>
            <FormField label="Supplier code" style={styles.field} error={codeExists ? "Code already exists." : undefined}>
              <TextInput
                value={draftCode}
                onChangeText={setDraftCode}
                placeholder="SUP-001"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </FormField>
            <FormField label="Supplier address" style={styles.field}>
              <TextInput
                value={draftAddress}
                onChangeText={setDraftAddress}
                placeholder="Address"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </FormField>
            <FormField label="Contact number" style={styles.field}>
              <TextInput
                value={draftContact}
                onChangeText={setDraftContact}
                placeholder="+91 90000 00000"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </FormField>
            <FormField label="Email ID" style={styles.field}>
              <TextInput
                value={draftEmail}
                onChangeText={setDraftEmail}
                placeholder="supplier@company.com"
                placeholderTextColor={theme.colors.inkSoft}
                autoCapitalize="none"
                style={styles.input}
              />
            </FormField>
            <FormField label="Inco terms" style={styles.field}>
              <TextInput
                value={draftInco}
                onChangeText={setDraftInco}
                placeholder="FOB, CIF"
                placeholderTextColor={theme.colors.inkSoft}
                style={styles.input}
              />
            </FormField>
            <FormField label="Lead time (days)" style={styles.field}>
              <TextInput
                value={draftLeadTime}
                onChangeText={setDraftLeadTime}
                keyboardType="numeric"
                style={styles.input}
              />
            </FormField>
            <FormField label="Minimum order qty (MOQ)" style={styles.field}>
              <TextInput
                value={draftMoq}
                onChangeText={setDraftMoq}
                keyboardType="numeric"
                style={styles.input}
              />
            </FormField>
            <FormField label="Purchase unit price" style={styles.field}>
              <TextInput
                value={draftPurchasePrice}
                onChangeText={setDraftPurchasePrice}
                keyboardType="numeric"
                style={styles.input}
              />
            </FormField>
            <FormField label="Last purchase price" style={styles.field}>
              <TextInput
                value={draftLastPrice}
                onChangeText={setDraftLastPrice}
                keyboardType="numeric"
                style={styles.input}
              />
            </FormField>
          </View>

          <Text style={styles.label}>Origin</Text>
          <View style={styles.chipRow}>
            {(["local", "abroad"] as SupplierOrigin[]).map((value) => {
              const activeChip = draftOrigin === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setDraftOrigin(value)}
                  style={[styles.chip, activeChip && styles.chipActive]}
                >
                  <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>
                    {value === "local" ? "Local" : "Abroad"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Contract type</Text>
          <View style={styles.chipRow}>
            {(["one_time", "blanket"] as ContractType[]).map((value) => {
              const activeChip = draftContractType === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setDraftContractType(value)}
                  style={[styles.chip, activeChip && styles.chipActive]}
                >
                  <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>
                    {value === "one_time" ? "One time PO" : "Blanket PO"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Contract duration</Text>
          <View style={styles.chipRow}>
            {(["1_year", "2_year", "3_year"] as ContractDuration[]).map((value) => {
              const activeChip = draftContractDuration === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setDraftContractDuration(value)}
                  style={[styles.chip, activeChip && styles.chipActive]}
                >
                  <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>
                    {value.replace("_", " ")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {[true, false].map((value) => {
              const activeChip = draftActive === value;
              return (
                <Pressable
                  key={String(value)}
                  onPress={() => setDraftActive(value)}
                  style={[styles.chip, activeChip && styles.chipActive]}
                >
                  <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>
                    {value ? "Active" : "Inactive"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button
            label="Create supplier"
            onPress={() => {
              if (!draftName.trim() || !draftCode.trim() || codeExists) {
                setCreateError(
                  codeExists ? "Supplier code already exists." : "Supplier name and code are required."
                );
                return;
              }
              const nextMoq = toNumber(draftMoq);
              if (nextMoq <= 0) {
                setCreateError("MOQ must be greater than 0.");
                return;
              }
              createSupplier({
                name: draftName.trim(),
                code: draftCode.trim(),
                address: draftAddress.trim(),
                contactNumber: draftContact.trim(),
                email: draftEmail.trim(),
                origin: draftOrigin,
                incoTerms: draftInco.trim(),
                leadTimeDays: toNumber(draftLeadTime),
                minimumOrderQuantity: nextMoq,
                purchaseUnitPrice: toNumber(draftPurchasePrice),
                lastPurchasePrice: toNumber(draftLastPrice),
                contractType: draftContractType,
                contractDuration: draftContractDuration,
                active: draftActive
              });
              setCreateError("");
              setDraftName("");
              setDraftCode("");
              setDraftAddress("");
              setDraftContact("");
              setDraftEmail("");
              setDraftInco("");
              setDraftLeadTime("0");
              setDraftMoq("0");
              setDraftPurchasePrice("0");
              setDraftLastPrice("0");
              setDraftContractType("one_time");
              setDraftContractDuration("1_year");
              setDraftOrigin("local");
              setDraftActive(true);
            }}
            disabled={!draftName.trim() || !draftCode.trim() || codeExists}
          />
          {createError ? <Text style={styles.errorText}>{createError}</Text> : null}
        </Card>

        <View style={styles.stack}>
          {suppliers.length === 0 ? (
            <Card>
              <Text style={styles.mutedText}>No suppliers yet.</Text>
            </Card>
          ) : (
            suppliers.map((supplier) => (
              <SupplierEditor
                key={supplier.id}
                supplier={supplier}
                onUpdate={(patch) => updateSupplier(supplier.id, patch)}
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
  stack: {
    gap: theme.spacing.md
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  field: {
    flex: 1,
    minWidth: 190
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.ink
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.inkSubtle
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
    color: theme.colors.inkSubtle,
    fontWeight: "600"
  },
  chipTextActive: {
    color: theme.colors.accentDark
  },
  actionRow: {
    marginTop: theme.spacing.sm,
    alignItems: "flex-start"
  },
  errorText: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.danger,
    fontWeight: "600"
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: theme.spacing.sm,
    marginBottom: theme.spacing.sm
  },
  mutedText: {
    fontSize: 12,
    color: theme.colors.inkSubtle
  }
});
