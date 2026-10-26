"use client"

import React, { useMemo, useState } from "react"
import { Printer, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Job, JobItem } from "@/types"

interface JobTicketProps {
  job: Job
}

interface ArtisanGroup {
  name: string
  items: JobItem[]
  totalPieces: number
  totalAmount: number
}

export function getItemPricing(item: JobItem) {
  const qty = Number(item.quantity_ordered) || 0

  let unitRate = 0
  if (typeof item.service_rate_per_unit === "number" && item.service_rate_per_unit > 0) {
    unitRate = item.service_rate_per_unit
  } else if (Number(item.original_amount) > 0 && qty > 0) {
    unitRate = Number(item.original_amount) / qty
  } else if (typeof item.product === "object" && item.product && "base_price" in item.product) {
    unitRate = Number((item.product as any).base_price) || 0
  }

  let subtotal = 0
  if (Number(item.original_amount) > 0) {
    subtotal = Number(item.original_amount)
  } else {
    subtotal = unitRate * qty
  }

  const finalPayment = Number(item.final_payment) || 0

  return { unitRate, subtotal, finalPayment, qty }
}

export function JobTicket({ job }: JobTicketProps) {
  const [selectedArtisan, setSelectedArtisan] = useState<string>("ALL")
  const [isPrinting, setIsPrinting] = useState<boolean>(false)
  const [printSuccess, setPrintSuccess] = useState<boolean>(false)

  const getArtisanName = (artisan: JobItem["artisan"]): string => {
    if (typeof artisan === "object" && artisan !== null) {
      return artisan.name || "Unassigned"
    }
    return String(artisan || "Unassigned")
  }

  const getProductTitle = (product: JobItem["product"]): string => {
    if (typeof product === "object" && product !== null) {
      const type = product.product_type || "Item"
      const animal = product.animal_type ? ` - ${product.animal_type}` : ""
      return `${type}${animal}`.replace(/_/g, " ").trim()
    }
    return `Product #${product}`
  }

  const artisanGroups = useMemo<ArtisanGroup[]>(() => {
    if (!job?.items || job.items.length === 0) return []

    const map = new Map<string, ArtisanGroup>()

    job.items.forEach((item) => {
      const name = getArtisanName(item.artisan)
      if (!map.has(name)) {
        map.set(name, {
          name,
          items: [],
          totalPieces: 0,
          totalAmount: 0,
        })
      }
      const group = map.get(name)!
      group.items.push(item)

      const { qty, subtotal } = getItemPricing(item)
      group.totalPieces += qty
      group.totalAmount += subtotal
    })

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [job])

  const totalPiecesAll = useMemo(() => {
    return artisanGroups.reduce((acc, g) => acc + g.totalPieces, 0)
  }, [artisanGroups])

  const totalAmountAll = useMemo(() => {
    const jobCost = Number(job?.total_cost)
    if (jobCost > 0) return jobCost
    return artisanGroups.reduce((acc, g) => acc + g.totalAmount, 0)
  }, [job, artisanGroups])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleString()
    try {
      return new Date(dateStr).toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const isIndividual = selectedArtisan !== "ALL"
  const displayedGroups = isIndividual
    ? artisanGroups.filter((g) => g.name === selectedArtisan)
    : artisanGroups

  // Generate plain-text ESC/POS layout for direct printing to POS-80
  const generateTicketText = (): string => {
    const divider = "=========================================="
    const subDivider = "------------------------------------------"
    const tearLine = "\n- - - - - - - - - - - - - - - - - - - -[✂]\n"

    let out = ""
    out += `${divider}\n`
    out += `        ARTISAN MANAGEMENT SYSTEM         \n`
    out += isIndividual ? `          ARTISAN WORK SLIP               \n` : `          PRODUCTION WORK DOCKET          \n`
    out += `${divider}\n`
    out += `Job ID:       #${job.job_id}\n`
    out += `Date:         ${formatDate(job.created_date)}\n`
    out += `Category:     ${job.service_category_display || job.service_category || "Production"}\n`
    out += `Status:       ${(job.status || "").replace(/_/g, " ")}\n`
    if (job.created_by) out += `Supervisor:   ${job.created_by}\n`
    if (!isIndividual) out += `Total Pieces: ${totalPiecesAll} pcs\n`
    out += `${divider}\n\n`

    displayedGroups.forEach((group, idx) => {
      out += `[${idx + 1}] ARTISAN: ${group.name.toUpperCase()}\n`
      out += `${subDivider}\n`
      group.items.forEach((item) => {
        const { unitRate, subtotal, qty } = getItemPricing(item)
        const title = getProductTitle(item.product)
        out += `• ${title}\n`
        if (unitRate > 0) {
          out += `  Qty: ${String(qty).padStart(3, " ")} pcs  @ Ksh ${unitRate.toFixed(2)} = Ksh ${subtotal.toFixed(2)}\n`
        } else {
          out += `  Qty: ${String(qty).padStart(3, " ")} pcs\n`
        }
      })
      out += `${subDivider}\n`
      out += `${group.name} Expected Pay: Ksh ${group.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
      out += `Total Pieces: ${group.totalPieces} pcs\n\n`
      out += `Artisan Sign: ____________________________\n`

      if (idx < displayedGroups.length - 1) {
        out += tearLine + "\n"
      }
    })

    if (!isIndividual) {
      out += `\n${divider}\n`
      out += `        SUPERVISOR MASTER SUMMARY         \n`
      out += `${divider}\n`
      out += `Total Artisans Assigned: ${String(artisanGroups.length).padStart(15, " ")}\n`
      out += `Total Pieces to Produce: ${String(totalPiecesAll + " pcs").padStart(15, " ")}\n`
      out += `${subDivider}\n`
      out += `TOTAL ESTIMATED JOB COST: Ksh ${totalAmountAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
      out += `${subDivider}\n`
      if (job.notes) out += `Notes: ${job.notes}\n\n`
      out += `Supervisor Sign: _________________________\n`
      out += `Printed: ${new Date().toLocaleString()}\n`
      out += `${divider}\n`
    }

    out += "\n\n\n\n\n"
    return out
  }

  // 1-Click Direct Print to POS-80 with fallback to window.print()
  const handlePrint = async () => {
    setIsPrinting(true)
    setPrintSuccess(false)

    try {
      const text = generateTicketText()
      const res = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, printer: "POS-80" }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setPrintSuccess(true)
        setTimeout(() => setPrintSuccess(false), 3000)
      } else {
        console.warn("Direct API print failed, triggering browser print dialog:", data.error)
        window.print()
      }
    } catch (err) {
      console.error("Direct print fetch failed, falling back to window.print():", err)
      window.print()
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <>
      {/* On-screen Print Control Group */}
      <div className="flex items-center gap-2">
        {artisanGroups.length > 1 && (
          <Select value={selectedArtisan} onValueChange={setSelectedArtisan}>
            <SelectTrigger className="w-[190px] h-8 text-xs bg-white border-slate-300">
              <SelectValue placeholder="All Artisans (Clustered)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-semibold">
                All Artisans (Clustered)
              </SelectItem>
              {artisanGroups.map((g) => (
                <SelectItem key={g.name} value={g.name} className="text-xs">
                  {g.name} ({g.totalPieces} pcs)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          onClick={handlePrint}
          disabled={isPrinting}
          variant="outline"
          size="sm"
          className={`flex items-center gap-2 border-slate-300 shadow-sm h-8 transition-colors ${
            printSuccess ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "hover:bg-slate-100"
          }`}
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
          ) : printSuccess ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Printer className="h-4 w-4 text-slate-700" />
          )}
          <span className="font-medium text-xs">
            {isPrinting ? "Printing..." : printSuccess ? "Printed to POS-80!" : "Print Ticket"}
          </span>
        </Button>
      </div>

      {/* Hidden during screen display, visible ONLY during @media print */}
      <div id="printable-job-ticket" className="hidden print:block">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div style={{ fontWeight: "bold", fontSize: "13px", textTransform: "uppercase" }}>
            Artisan Management System
          </div>
          <div style={{ fontSize: "11px", letterSpacing: "1px", fontWeight: "bold" }}>
            {isIndividual ? `*** ARTISAN WORK SLIP ***` : `*** PRODUCTION WORK DOCKET ***`}
          </div>
          <div style={{ borderBottom: "1.5px solid #000", margin: "6px 0" }} />
        </div>

        {/* Job Details Table */}
        <table style={{ width: "100%", fontSize: "11px", marginBottom: "6px" }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: "bold", width: "42%" }}>Job ID:</td>
              <td style={{ fontWeight: "bold" }}>#{job.job_id}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Date:</td>
              <td>{formatDate(job.created_date)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Category:</td>
              <td>{job.service_category_display || job.service_category || "Production"}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Status:</td>
              <td>{job.status?.replace(/_/g, " ")}</td>
            </tr>
            {job.created_by && (
              <tr>
                <td style={{ fontWeight: "bold" }}>Supervisor:</td>
                <td>{job.created_by}</td>
              </tr>
            )}
            {!isIndividual && (
              <tr>
                <td style={{ fontWeight: "bold" }}>Total Artisans:</td>
                <td>{artisanGroups.length}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ borderBottom: "1.5px solid #000", margin: "6px 0" }} />

        {/* Clustered Artisan Sections */}
        {displayedGroups.map((group, groupIdx) => (
          <div key={group.name} style={{ marginBottom: "12px" }}>
            <div
              style={{
                backgroundColor: "#eee",
                padding: "3px 4px",
                fontWeight: "bold",
                fontSize: "11px",
                border: "1px solid #000",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>[{groupIdx + 1}] ARTISAN: {group.name.toUpperCase()}</span>
              <span>{group.totalPieces} pcs</span>
            </div>

            <div style={{ marginTop: "4px" }}>
              {group.items.map((item, idx) => {
                const { unitRate, subtotal, qty } = getItemPricing(item)
                return (
                  <div
                    key={item.id || idx}
                    style={{
                      padding: "3px 0",
                      borderBottom: "0.5px dotted #999",
                      fontSize: "10px",
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>
                      • {getProductTitle(item.product)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingLeft: "6px",
                        marginTop: "1px",
                        color: "#222",
                      }}
                    >
                      <span>
                        Qty: <strong>{qty} pcs</strong>
                        {unitRate > 0 && (
                          <span> @ Ksh {unitRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        )}
                      </span>
                      <span style={{ fontWeight: "bold" }}>
                        Ksh {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              style={{
                marginTop: "5px",
                padding: "3px 0",
                borderTop: "1px dashed #000",
                borderBottom: "1px dashed #000",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                fontWeight: "bold",
              }}
            >
              <span>{group.name} Expected Pay:</span>
              <span>
                Ksh {group.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ fontSize: "9px", marginTop: "2px", color: "#555" }}>
              Total Pieces: {group.totalPieces} pcs
            </div>

            <div style={{ marginTop: "8px", fontSize: "10px" }}>
              <div>Artisan Sign: ___________________________</div>
            </div>

            {groupIdx < displayedGroups.length - 1 && (
              <div
                style={{
                  margin: "12px 0 8px 0",
                  textAlign: "center",
                  fontSize: "9px",
                  letterSpacing: "1px",
                  borderBottom: "1px dashed #888",
                  lineHeight: "0.1em",
                }}
              >
                <span style={{ background: "#fff", padding: "0 6px", color: "#666" }}>
                  - - - - - - [✂ TEAR HERE] - - - - - -
                </span>
              </div>
            )}
          </div>
        ))}

        {!isIndividual && (
          <div style={{ marginTop: "10px", borderTop: "2px solid #000", paddingTop: "6px" }}>
            <div style={{ fontWeight: "bold", fontSize: "11px", textAlign: "center", marginBottom: "6px" }}>
              SUPERVISOR MASTER SUMMARY
            </div>
            <table style={{ width: "100%", fontSize: "11px" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: "bold" }}>Total Artisans Assigned:</td>
                  <td style={{ textAlign: "right", fontWeight: "bold" }}>{artisanGroups.length}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: "bold" }}>Total Pieces to Produce:</td>
                  <td style={{ textAlign: "right", fontWeight: "bold" }}>{totalPiecesAll} pcs</td>
                </tr>
                <tr style={{ borderTop: "1px solid #000" }}>
                  <td style={{ fontWeight: "bold", paddingTop: "4px" }}>TOTAL ESTIMATED JOB COST:</td>
                  <td style={{ textAlign: "right", fontWeight: "bold", fontSize: "12px", paddingTop: "4px" }}>
                    Ksh {totalAmountAll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {job.notes && (
              <div style={{ marginTop: "6px", fontSize: "10px" }}>
                <span style={{ fontWeight: "bold" }}>Notes: </span>
                <span>{job.notes}</span>
              </div>
            )}

            <div style={{ marginTop: "12px", fontSize: "10px" }}>
              <div>Supervisor Sign: ___________________________</div>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: "9px", marginTop: "12px", color: "#666" }}>
          Printed: {new Date().toLocaleString()}
          <div style={{ letterSpacing: "2px", marginTop: "4px" }}>*** COMPLETED ***</div>
        </div>
      </div>
    </>
  )
}
