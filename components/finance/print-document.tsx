"use client";

import { format } from "date-fns";
import React from "react";

const GOLD = "#d4a857";
const GOLD_LIGHT = "#f5e6c8";
const GOLD_RULE = "#e8c47a";
const TEXT_DARK = "#1f2937";
const TEXT_MUTED = "#6b7280";

type PrintItem = {
    description: string;
    date?: Date | string | null;
    scheduleShiftDetail?: string | null;
    actualShiftDetails?: string | null;
    quantity: number;
    price: number;
    amount: number;
};

type PrintCompany = {
    companyName?: string | null;
    companyEmail?: string | null;
    companyPhone?: string | null;
    companyAddress?: string | null;
    companyTagline?: string | null;
    companyLogoUrl?: string | null;
} | null | undefined;

type PrintBillTo = {
    name: string;
    business?: string | null;
    email?: string | null;
};

export type PrintDocumentProps = {
    variant: "BILL" | "INVOICE";
    documentNo: string;
    documentDate: Date | string;
    dueDate?: Date | string | null;
    terms?: string | null;
    status: string;

    billTo: PrintBillTo;
    company: PrintCompany;

    items: PrintItem[];

    subtotal: number;
    discountAmount: number;
    shippingAmount: number;
    salesTaxAmount: number;
    depositAmount: number;
    totalDue: number;

    notes?: string | null;

    customFields?: Array<{ label: string; value: string }>;
};

const formatCurrency = (n: number) => `$${n.toFixed(2)}`;
const formatDate = (d?: Date | string | null) =>
    d ? format(new Date(d), "MM/dd/yyyy") : "";

type WatermarkStyle = { text: string; fill: string; stroke: string };

function getWatermark(status: string): WatermarkStyle | null {
    switch (status) {
        case "PAID":
            return {
                text: "PAID",
                fill: "rgba(34, 197, 94, 0.18)",
                stroke: "rgba(22, 163, 74, 0.7)",
            };
        case "VOID":
            return {
                text: "VOID",
                fill: "rgba(107, 114, 128, 0.18)",
                stroke: "rgba(75, 85, 99, 0.7)",
            };
        case "CANCELLED":
            return {
                text: "CANCELLED",
                fill: "rgba(239, 68, 68, 0.16)",
                stroke: "rgba(220, 38, 38, 0.7)",
            };
        case "OVERDUE":
            return {
                text: "OVERDUE",
                fill: "rgba(239, 68, 68, 0.16)",
                stroke: "rgba(220, 38, 38, 0.7)",
            };
        case "DRAFT":
            return {
                text: "DRAFT",
                fill: "rgba(156, 163, 175, 0.18)",
                stroke: "rgba(107, 114, 128, 0.7)",
            };
        default:
            return null;
    }
}

export function PrintDocument(props: PrintDocumentProps) {
    const {
        variant,
        documentNo,
        documentDate,
        dueDate,
        terms,
        status,
        billTo,
        company,
        items,
        subtotal,
        discountAmount,
        shippingAmount,
        salesTaxAmount,
        depositAmount,
        totalDue,
        notes,
        customFields,
    } = props;

    const visibleCustomFields = (customFields ?? []).filter((f) => f.value && f.value.trim().length > 0);

    const isInvoice = variant === "INVOICE";
    const watermark = getWatermark(status);
    const companyName = company?.companyName || "";
    const logoUrl = company?.companyLogoUrl || "";

    return (
        <div
            className="print-doc hidden print:block"
            style={{
                color: TEXT_DARK,
                fontFamily: "Helvetica, Arial, sans-serif",
                fontSize: "11px",
                lineHeight: 1.4,
                position: "relative",
            }}
        >
            {/* Status Watermark */}
            {watermark && (
                <div
                    aria-hidden
                    style={{
                        position: "absolute",
                        top: "45%",
                        left: "50%",
                        transform: "translate(-50%, -50%) rotate(-22deg)",
                        fontSize: "140px",
                        fontWeight: 800,
                        color: watermark.fill,
                        WebkitTextStroke: `4px ${watermark.stroke}`,
                        letterSpacing: "10px",
                        pointerEvents: "none",
                        zIndex: 50,
                        userSelect: "none",
                        whiteSpace: "nowrap",
                        textTransform: "uppercase",
                    }}
                >
                    {watermark.text}
                </div>
            )}

            {/* Header: company info + logo */}
            <div
                className="print-doc__avoid-break"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "24px",
                    marginBottom: "24px",
                }}
            >
                <div style={{ flex: 1 }}>
                    {companyName && (
                        <div
                            style={{
                                fontSize: "16px",
                                fontWeight: 700,
                                marginBottom: "10px",
                            }}
                        >
                            {companyName}
                        </div>
                    )}
                    {company?.companyPhone && (
                        <div style={{ marginBottom: "2px" }}>{company.companyPhone}</div>
                    )}
                    {company?.companyEmail && (
                        <div style={{ marginBottom: "2px" }}>{company.companyEmail}</div>
                    )}
                    {company?.companyTagline && (
                        <div style={{ color: TEXT_MUTED, marginBottom: "2px" }}>
                            {company.companyTagline}
                        </div>
                    )}
                </div>
                <div
                    style={{
                        flex: "0 0 auto",
                        textAlign: "right",
                        minWidth: "180px",
                    }}
                >
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt={companyName || "Company logo"}
                            style={{
                                maxHeight: "70px",
                                maxWidth: "180px",
                                objectFit: "contain",
                                display: "inline-block",
                            }}
                        />
                    ) : (
                        companyName && (
                            <div
                                style={{
                                    fontSize: "20px",
                                    fontWeight: 700,
                                    color: GOLD,
                                    letterSpacing: "1px",
                                }}
                            >
                                {companyName}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Document title */}
            <div
                style={{
                    fontSize: "32px",
                    fontWeight: 400,
                    color: GOLD,
                    letterSpacing: "2px",
                    marginBottom: "16px",
                }}
            >
                {variant}
            </div>

            {/* Bill To + meta */}
            <div
                className="print-doc__avoid-break"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "24px",
                    marginBottom: "12px",
                }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>BILL TO</div>
                    <div>{billTo.name}</div>
                    {billTo.business && <div>{billTo.business}</div>}
                    {billTo.email && (
                        <div style={{ color: TEXT_MUTED }}>{billTo.email}</div>
                    )}
                </div>
                <div
                    style={{
                        flex: "0 0 auto",
                        minWidth: "240px",
                        textAlign: "right",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <span style={{ fontWeight: 700 }}>{isInvoice ? "INVOICE #" : "BILL #"}</span>
                        <span style={{ minWidth: "90px", textAlign: "left" }}>{documentNo}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <span style={{ fontWeight: 700 }}>DATE</span>
                        <span style={{ minWidth: "90px", textAlign: "left" }}>{formatDate(documentDate)}</span>
                    </div>
                    {dueDate && (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <span style={{ fontWeight: 700 }}>DUE DATE</span>
                            <span style={{ minWidth: "90px", textAlign: "left" }}>{formatDate(dueDate)}</span>
                        </div>
                    )}
                    {terms && (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <span style={{ fontWeight: 700 }}>TERMS</span>
                            <span style={{ minWidth: "90px", textAlign: "left" }}>{terms}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom fields */}
            {visibleCustomFields.length > 0 && (
                <div
                    className="print-doc__avoid-break"
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "16px 32px",
                        marginTop: "8px",
                        marginBottom: "4px",
                    }}
                >
                    {visibleCustomFields.map((f, i) => (
                        <div key={i} style={{ minWidth: "140px" }}>
                            <div style={{ fontWeight: 700, fontSize: "10px", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                {f.label}
                            </div>
                            <div>{f.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Gold rule */}
            <div
                style={{
                    height: "2px",
                    backgroundColor: GOLD_RULE,
                    margin: "8px 0 16px 0",
                }}
            />

            {/* Items table */}
            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "12px",
                }}
            >
                <thead>
                    <tr style={{ backgroundColor: GOLD_LIGHT }}>
                        {isInvoice ? (
                            <>
                                <th style={thStyle}>SHIFT DATE</th>
                                <th style={thStyle}>SHIFT POSITION</th>
                                <th style={thStyle}>EVENT DETAILS</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>QTY</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>RATE</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>AMOUNT</th>
                            </>
                        ) : (
                            <>
                                <th style={thStyle}>DESCRIPTION</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>QTY</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>RATE</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>AMOUNT</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => {
                        const eventDetails =
                            item.scheduleShiftDetail || item.actualShiftDetails || "";
                        return (
                            <tr key={idx} style={{ borderBottom: `1px solid #f0f0f0` }}>
                                {isInvoice ? (
                                    <>
                                        <td style={tdStyle}>{formatDate(item.date)}</td>
                                        <td style={{ ...tdStyle, fontWeight: 600 }}>
                                            {item.description}
                                        </td>
                                        <td style={tdStyle}>{eventDetails}</td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>
                                            {item.quantity.toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>
                                            {formatCurrency(item.price)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>
                                            {formatCurrency(item.amount)}
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600 }}>{item.description}</div>
                                            {item.date && (
                                                <div style={{ color: TEXT_MUTED, fontSize: "10px" }}>
                                                    {formatDate(item.date)}
                                                </div>
                                            )}
                                            {eventDetails && (
                                                <div style={{ color: TEXT_MUTED, fontSize: "10px" }}>
                                                    {eventDetails}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>
                                            {item.quantity.toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>
                                            {formatCurrency(item.price)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "right" }}>
                                            {formatCurrency(item.amount)}
                                        </td>
                                    </>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Footer: payment details (left) + totals (right) */}
            <div
                className="print-doc__avoid-break"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "24px",
                    borderTop: `1px dashed #d1d5db`,
                    paddingTop: "12px",
                }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "8px" }}>
                        -For online (ACH/Credit Card) payment options: - please contact us.
                    </div>
                    {(companyName || company?.companyAddress) && (
                        <div style={{ marginBottom: "8px" }}>
                            <div>-Send checks payable to:</div>
                            {companyName && <div>{companyName}</div>}
                            {company?.companyAddress && (
                                <div style={{ whiteSpace: "pre-wrap" }}>
                                    {company.companyAddress}
                                </div>
                            )}
                        </div>
                    )}
                    <div style={{ marginBottom: "8px" }}>
                        We appreciate your business. Please find your invoice details here.
                        Feel free to contact us if you have any questions.
                    </div>
                </div>
                <div style={{ flex: "0 0 auto", minWidth: "220px" }}>
                    <TotalsRow label="Subtotal" value={formatCurrency(subtotal)} />
                    {discountAmount > 0 && (
                        <TotalsRow label="Discount" value={`-${formatCurrency(discountAmount)}`} />
                    )}
                    {shippingAmount > 0 && (
                        <TotalsRow label="Shipping" value={formatCurrency(shippingAmount)} />
                    )}
                    {salesTaxAmount > 0 && (
                        <TotalsRow label="Sales Tax" value={formatCurrency(salesTaxAmount)} />
                    )}
                    {depositAmount > 0 && (
                        <TotalsRow label="PAYMENT" value={formatCurrency(depositAmount)} />
                    )}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            paddingTop: "8px",
                            marginTop: "4px",
                            borderTop: `1px solid ${GOLD_RULE}`,
                            fontWeight: 700,
                            fontSize: "14px",
                        }}
                    >
                        <span>BALANCE DUE</span>
                        <span>{formatCurrency(totalDue)}</span>
                    </div>
                </div>
            </div>

            {/* Notes (optional) */}
            {notes && (
                <div
                    style={{
                        marginTop: "16px",
                        whiteSpace: "pre-wrap",
                        color: TEXT_DARK,
                    }}
                >
                    {notes}
                </div>
            )}

            {/* Closing line */}
            {companyName && (
                <div style={{ marginTop: "24px" }}>
                    <div>Have a great day!</div>
                    <div>{companyName}</div>
                </div>
            )}
        </div>
    );
}

function TotalsRow({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "2px 0",
            }}
        >
            <span style={{ color: TEXT_MUTED }}>{label}</span>
            <span>{value}</span>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 6px",
    fontSize: "10px",
    fontWeight: 600,
    color: TEXT_MUTED,
    letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
    padding: "10px 6px",
    verticalAlign: "top",
    fontSize: "11px",
};
