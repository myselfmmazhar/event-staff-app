import OAuthClient from "intuit-oauth";
import { PrismaClient } from "@prisma/client";

const QB_BASE_URL_SANDBOX = "https://sandbox-quickbooks.api.intuit.com";
const QB_BASE_URL_PRODUCTION = "https://quickbooks.api.intuit.com";
const QB_API_VERSION = "v3";

export type QBEntityType =
  | "Invoice"
  | "Bill"
  | "Estimate"
  | "Customer"
  | "Vendor"
  | "Item"
  | "TimeActivity";

// ─── OAuth Client Factory ────────────────────────────────────────────────────

export function createOAuthClient(): OAuthClient {
  return new OAuthClient({
    clientId: process.env.QUICKBOOKS_CLIENT_ID!,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
    environment: (process.env.QUICKBOOKS_ENVIRONMENT ?? "sandbox") as
      | "sandbox"
      | "production",
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!,
    logging: process.env.NODE_ENV === "development",
  });
}

// ─── QuickBooks Service ──────────────────────────────────────────────────────

export class QuickBooksService {
  private baseUrl: string;

  constructor(private prisma: PrismaClient) {
    const env = process.env.QUICKBOOKS_ENVIRONMENT ?? "sandbox";
    this.baseUrl =
      env === "production" ? QB_BASE_URL_PRODUCTION : QB_BASE_URL_SANDBOX;
  }

  // ── Connection helpers ────────────────────────────────────────────────────

  /** Returns the stored connection, or null if not connected. */
  async getConnection() {
    const connections = await this.prisma.quickBooksConnection.findMany({
      take: 1,
      orderBy: { createdAt: "desc" },
    });
    return connections[0] ?? null;
  }

  /** Returns true when a valid connection record exists. */
  async isConnected(): Promise<boolean> {
    const conn = await this.getConnection();
    return conn !== null;
  }

  /**
   * Refreshes the access token if it has expired (or will expire in the next
   * 5 minutes) and persists the new tokens.
   */
  async refreshTokenIfNeeded(): Promise<string> {
    const conn = await this.getConnection();
    if (!conn) throw new Error("QuickBooks is not connected.");

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (conn.tokenExpiry > fiveMinutesFromNow) {
      return conn.accessToken;
    }

    const oauthClient = createOAuthClient();
    oauthClient.setToken({
      token_type: "bearer",
      access_token: conn.accessToken,
      refresh_token: conn.refreshToken,
      realmId: conn.realmId,
    });

    const authResponse = await oauthClient.refreshUsingToken(conn.refreshToken);
    const newToken = authResponse.getJson();

    const expiresAt = new Date(
      Date.now() + (newToken.expires_in ?? 3600) * 1000
    );

    await this.prisma.quickBooksConnection.update({
      where: { realmId: conn.realmId },
      data: {
        accessToken: newToken.access_token,
        refreshToken: newToken.refresh_token ?? conn.refreshToken,
        tokenExpiry: expiresAt,
      },
    });

    return newToken.access_token;
  }

  // ── QB REST API helper ────────────────────────────────────────────────────

  private async qbFetch(
    realmId: string,
    path: string,
    options: RequestInit = {}
  ): Promise<unknown> {
    const accessToken = await this.refreshTokenIfNeeded();
    const url = `${this.baseUrl}/${QB_API_VERSION}/company/${realmId}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`QuickBooks API error ${response.status}: ${body}`);
    }

    return response.json();
  }

  // ── Sync map helpers ──────────────────────────────────────────────────────

  async getSyncMap(entityType: QBEntityType, localId: string) {
    return this.prisma.quickBooksSyncMap.findFirst({
      where: { entityType, localId },
    });
  }

  private async upsertSyncMap(
    entityType: QBEntityType,
    localId: string,
    qbId: string,
    qbSyncToken?: string
  ) {
    return this.prisma.quickBooksSyncMap.upsert({
      where: { entityType_localId: { entityType, localId } },
      create: {
        entityType,
        localId,
        qbId,
        qbSyncToken: qbSyncToken ?? null,
        lastSyncedAt: new Date(),
      },
      update: {
        qbId,
        qbSyncToken: qbSyncToken ?? null,
        lastSyncedAt: new Date(),
      },
    });
  }

  // ── Customer (Client) sync ────────────────────────────────────────────────

  async syncClient(clientId: string) {
    const conn = await this.getConnection();
    if (!conn) throw new Error("QuickBooks is not connected.");

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new Error(`Client ${clientId} not found.`);

    const existing = await this.getSyncMap("Customer", clientId);

    const payload: Record<string, unknown> = {
      DisplayName: client.businessName,
      GivenName: client.firstName,
      FamilyName: client.lastName,
      PrimaryEmailAddr: { Address: client.email },
      PrimaryPhone: { FreeFormNumber: client.cellPhone },
      BillAddr: {
        Line1: client.businessAddress ?? "",
        City: client.city,
        CountrySubDivisionCode: client.state,
        PostalCode: client.zipCode,
      },
    };

    let qbCustomer: Record<string, unknown>;

    if (existing) {
      // Update existing QB customer
      const result = (await this.qbFetch(
        conn.realmId,
        "/customer",
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            Id: existing.qbId,
            SyncToken: existing.qbSyncToken ?? "0",
            sparse: true,
          }),
        }
      )) as { Customer: Record<string, unknown> };
      qbCustomer = result.Customer;
    } else {
      // Create new QB customer
      const result = (await this.qbFetch(
        conn.realmId,
        "/customer",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )) as { Customer: Record<string, unknown> };
      qbCustomer = result.Customer;
    }

    await this.upsertSyncMap(
      "Customer",
      clientId,
      qbCustomer.Id as string,
      qbCustomer.SyncToken as string
    );

    return qbCustomer;
  }

  // ── Vendor (Staff/Contractor) sync ────────────────────────────────────────

  async syncStaff(staffId: string) {
    const conn = await this.getConnection();
    if (!conn) throw new Error("QuickBooks is not connected.");

    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: { taxDetails: true },
    });
    if (!staff) throw new Error(`Staff ${staffId} not found.`);

    const existing = await this.getSyncMap("Vendor", staffId);

    const displayName = `${staff.firstName} ${staff.lastName}`.trim();

    const payload: Record<string, unknown> = {
      DisplayName: displayName,
      GivenName: staff.firstName,
      FamilyName: staff.lastName,
      PrimaryEmailAddr: { Address: staff.email },
      PrimaryPhone: { FreeFormNumber: staff.phone },
      BillAddr: {
        Line1: staff.streetAddress,
        City: staff.city,
        CountrySubDivisionCode: staff.state,
        PostalCode: staff.zipCode,
      },
      ...(staff.taxDetails?.ein && {
        TaxIdentifier: staff.taxDetails.ein,
      }),
    };

    let qbVendor: Record<string, unknown>;

    if (existing) {
      const result = (await this.qbFetch(
        conn.realmId,
        "/vendor",
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            Id: existing.qbId,
            SyncToken: existing.qbSyncToken ?? "0",
            sparse: true,
          }),
        }
      )) as { Vendor: Record<string, unknown> };
      qbVendor = result.Vendor;
    } else {
      const result = (await this.qbFetch(
        conn.realmId,
        "/vendor",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )) as { Vendor: Record<string, unknown> };
      qbVendor = result.Vendor;
    }

    await this.upsertSyncMap(
      "Vendor",
      staffId,
      qbVendor.Id as string,
      qbVendor.SyncToken as string
    );

    return qbVendor;
  }

  // ── Item (Service / Product) sync ─────────────────────────────────────────

  async syncService(serviceId: string) {
    const conn = await this.getConnection();
    if (!conn) throw new Error("QuickBooks is not connected.");

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new Error(`Service ${serviceId} not found.`);

    const existing = await this.getSyncMap("Item", serviceId);

    const payload: Record<string, unknown> = {
      Name: service.title,
      Description: service.description ?? "",
      Type: "Service",
      UnitPrice: service.price?.toNumber() ?? 0,
      IncomeAccountRef: { name: "Sales of Product Income" },
    };

    let qbItem: Record<string, unknown>;

    if (existing) {
      const result = (await this.qbFetch(
        conn.realmId,
        "/item",
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            Id: existing.qbId,
            SyncToken: existing.qbSyncToken ?? "0",
            sparse: true,
          }),
        }
      )) as { Item: Record<string, unknown> };
      qbItem = result.Item;
    } else {
      const result = (await this.qbFetch(
        conn.realmId,
        "/item",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )) as { Item: Record<string, unknown> };
      qbItem = result.Item;
    }

    await this.upsertSyncMap(
      "Item",
      serviceId,
      qbItem.Id as string,
      qbItem.SyncToken as string
    );

    return qbItem;
  }

  // ── Invoice sync ──────────────────────────────────────────────────────────

  async syncInvoice(invoiceId: string) {
    const conn = await this.getConnection();
    if (!conn) throw new Error("QuickBooks is not connected.");

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: { include: { service: true, product: true } }, client: true },
    });
    if (!invoice) throw new Error(`Invoice ${invoiceId} not found.`);

    // Ensure client is synced first → get QB Customer ID
    let customerMap = await this.getSyncMap("Customer", invoice.clientId);
    if (!customerMap) {
      await this.syncClient(invoice.clientId);
      customerMap = await this.getSyncMap("Customer", invoice.clientId);
    }

    const existing = await this.getSyncMap("Invoice", invoiceId);

    // Build line items
    const lineItems = await Promise.all(
      invoice.items.map(async (item, idx) => {
        const lineItem: Record<string, unknown> = {
          LineNum: idx + 1,
          Description: item.description,
          Amount: item.amount.toNumber(),
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            Qty: item.quantity.toNumber(),
            UnitPrice: item.price.toNumber(),
          },
        };

        // If linked to a service, try to get/sync QB Item reference
        if (item.serviceId) {
          let itemMap = await this.getSyncMap("Item", item.serviceId);
          if (!itemMap) {
            await this.syncService(item.serviceId);
            itemMap = await this.getSyncMap("Item", item.serviceId);
          }
          if (itemMap) {
            (lineItem.SalesItemLineDetail as Record<string, unknown>).ItemRef = {
              value: itemMap.qbId,
            };
          }
        }

        return lineItem;
      })
    );

    const payload: Record<string, unknown> = {
      DocNumber: invoice.invoiceNo,
      TxnDate: invoice.invoiceDate.toISOString().split("T")[0],
      DueDate: invoice.dueDate?.toISOString().split("T")[0],
      CustomerRef: { value: customerMap!.qbId },
      Line: lineItems,
      ...(invoice.notes && { CustomerMemo: { value: invoice.notes } }),
    };

    let qbInvoice: Record<string, unknown>;

    if (existing) {
      const result = (await this.qbFetch(
        conn.realmId,
        "/invoice",
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            Id: existing.qbId,
            SyncToken: existing.qbSyncToken ?? "0",
            sparse: true,
          }),
        }
      )) as { Invoice: Record<string, unknown> };
      qbInvoice = result.Invoice;
    } else {
      const result = (await this.qbFetch(
        conn.realmId,
        "/invoice",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )) as { Invoice: Record<string, unknown> };
      qbInvoice = result.Invoice;
    }

    await this.upsertSyncMap(
      "Invoice",
      invoiceId,
      qbInvoice.Id as string,
      qbInvoice.SyncToken as string
    );

    return qbInvoice;
  }

  // ── Bill sync ─────────────────────────────────────────────────────────────

  async syncBill(billId: string) {
    const conn = await this.getConnection();
    if (!conn) throw new Error("QuickBooks is not connected.");

    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: { items: { include: { service: true, product: true } }, staff: true },
    });
    if (!bill) throw new Error(`Bill ${billId} not found.`);

    // Ensure staff (vendor) is synced first
    let vendorMap = await this.getSyncMap("Vendor", bill.staffId);
    if (!vendorMap) {
      await this.syncStaff(bill.staffId);
      vendorMap = await this.getSyncMap("Vendor", bill.staffId);
    }

    const existing = await this.getSyncMap("Bill", billId);

    const lineItems = bill.items.map((item, idx) => ({
      LineNum: idx + 1,
      Description: item.description,
      Amount: item.amount.toNumber(),
      DetailType: "AccountBasedExpenseLineDetail",
      AccountBasedExpenseLineDetail: {
        AccountRef: { name: "Cost of Goods Sold" },
        BillableStatus: "NotBillable",
      },
    }));

    const payload: Record<string, unknown> = {
      DocNumber: bill.billNo,
      TxnDate: bill.billDate.toISOString().split("T")[0],
      DueDate: bill.dueDate?.toISOString().split("T")[0],
      VendorRef: { value: vendorMap!.qbId },
      Line: lineItems,
      ...(bill.notes && { Memo: bill.notes }),
    };

    let qbBill: Record<string, unknown>;

    if (existing) {
      const result = (await this.qbFetch(
        conn.realmId,
        "/bill",
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            Id: existing.qbId,
            SyncToken: existing.qbSyncToken ?? "0",
            sparse: true,
          }),
        }
      )) as { Bill: Record<string, unknown> };
      qbBill = result.Bill;
    } else {
      const result = (await this.qbFetch(
        conn.realmId,
        "/bill",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )) as { Bill: Record<string, unknown> };
      qbBill = result.Bill;
    }

    await this.upsertSyncMap(
      "Bill",
      billId,
      qbBill.Id as string,
      qbBill.SyncToken as string
    );

    return qbBill;
  }

  // ── Sync summary ──────────────────────────────────────────────────────────

  async getSyncStats() {
    const [invoices, bills, clients, staff, services] = await Promise.all([
      this.prisma.quickBooksSyncMap.count({ where: { entityType: "Invoice" } }),
      this.prisma.quickBooksSyncMap.count({ where: { entityType: "Bill" } }),
      this.prisma.quickBooksSyncMap.count({ where: { entityType: "Customer" } }),
      this.prisma.quickBooksSyncMap.count({ where: { entityType: "Vendor" } }),
      this.prisma.quickBooksSyncMap.count({ where: { entityType: "Item" } }),
    ]);

    return { invoices, bills, clients, staff, services };
  }

  // ── Disconnect ────────────────────────────────────────────────────────────

  async disconnect() {
    const conn = await this.getConnection();
    if (!conn) return;

    try {
      const oauthClient = createOAuthClient();
      oauthClient.setToken({
        token_type: "bearer",
        access_token: conn.accessToken,
        refresh_token: conn.refreshToken,
        realmId: conn.realmId,
      });
      await oauthClient.revoke(conn.refreshToken as unknown as Parameters<typeof oauthClient.revoke>[0]);
    } catch {
      // Best-effort revoke — proceed with deletion even if revoke fails
    }

    await this.prisma.quickBooksConnection.delete({ where: { realmId: conn.realmId } });
  }
}
