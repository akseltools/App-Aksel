/**
 * components/consignment/ConsignmentContractDialog.tsx
 * Dialog to sign and export consignment contracts.
 * Renders an A4 PDF contract preview with store details, a tools list,
 * an interactive signature pad, a watermark logo, and exports to PDF.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { PenTool, Download, RefreshCw, X } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// Helper to parse product name into Tool name and Model
function parseProductName(fullName: string) {
  const lower = fullName.toLowerCase();
  if (lower.startsWith("chave philips")) {
    return {
      tool: "Chave Philips",
      model: fullName.substring("chave philips".length).trim(),
    };
  }
  if (lower.startsWith("chave de fenda")) {
    return {
      tool: "Chave de Fenda",
      model: fullName.substring("chave de fenda".length).trim(),
    };
  }
  const parts = fullName.split(" ");
  if (parts.length > 1) {
    return {
      tool: parts[0],
      model: parts.slice(1).join(" "),
    };
  }
  return {
    tool: fullName,
    model: "—",
  };
}

// Helper to format CPF / CNPJ on the fly
function formatCnpjCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    // CNPJ: 00.000.000/0000-00
    return digits
      .substring(0, 14) // Limit to 14 digits max
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
}

interface ConsignmentContractDialogProps {
  consignment: any;
  onClose: () => void;
}

export default function ConsignmentContractDialog({
  consignment,
  onClose,
}: ConsignmentContractDialogProps) {
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [representative, setRepresentative] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printTemplateRef = useRef<HTMLDivElement>(null);

  // Initialize values when consignment changes
  useEffect(() => {
    if (consignment) {
      setCnpj("");
      setPhone("");
      setEmail(consignment.users?.full_name || consignment.users?.username || "");
      setAddress("");
      setRepresentative(consignment.users?.full_name || consignment.users?.username || "");
      setSignatureData(null);
      clearCanvas();
    }
  }, [consignment]);

  // Setup canvas settings and resize dynamically to match display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#000000"; // Black ink for contrast
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
      }
    };

    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [consignment]);

  // Global mouseup listener to ensure drawing stops and saves signature even if mouse is released outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const blank = document.createElement("canvas");
        blank.width = canvas.width;
        blank.height = canvas.height;
        if (canvas.toDataURL() !== blank.toDataURL()) {
          setSignatureData(canvas.toDataURL());
        }
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDrawing]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const blank = document.createElement("canvas");
      blank.width = canvas.width;
      blank.height = canvas.height;
      if (canvas.toDataURL() !== blank.toDataURL()) {
        setSignatureData(canvas.toDataURL());
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleExportPDF = async () => {
    if (!consignment) return;
    setIsExporting(true);

    try {
      const template = printTemplateRef.current;
      if (!template) return;

      // Render template to canvas
      const canvas = await html2canvas(template, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Contrato_Consignacao_${consignment.store_name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!consignment) return null;

  const items = (consignment.consignment_items ?? []).filter((i: any) => i.quantity_sent > 0);
  const totalValue = items.reduce((acc: number, item: any) => acc + item.quantity_sent * item.unit_price, 0);

  const formattedSentDate = consignment.sent_at
    ? new Date(consignment.sent_at).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  return (
    <Dialog open={!!consignment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white w-[95vw] lg:max-w-7xl h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b border-[#2a2a2a] pb-3 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <PenTool className="h-5 w-5 text-aksel-500" />
            Gerar e Assinar Contrato — {consignment.store_name}
          </DialogTitle>
        </DialogHeader>

        {/* Two columns: Left inputs + Signature, Right: PDF print preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 min-h-0">
          {/* Left panel */}
          <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-[#1c1c1c] p-4 rounded-lg border border-[#2a2a2a] space-y-3">
                <h4 className="font-semibold text-sm text-zinc-300 uppercase tracking-wider">
                  Dados do Lojista
                </h4>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">CNPJ / CPF</Label>
                  <Input
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpjCpf(e.target.value))}
                    placeholder="Ex: 38.045.288/0001-19"
                    className="bg-[#121212] border-[#2a2a2a] text-sm h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Telefone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (12) 99124-6034"
                    className="bg-[#121212] border-[#2a2a2a] text-sm h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">E-mail ou Contato</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: Robson"
                    className="bg-[#121212] border-[#2a2a2a] text-sm h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400">Endereço</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Avenida São Pedro, 1615 - Taubaté - SP"
                    className="bg-[#121212] border-[#2a2a2a] text-sm h-8"
                  />
                </div>
              </div>

              {/* Signature Pad */}
              <div className="bg-[#1c1c1c] p-4 rounded-lg border border-[#2a2a2a] space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-sm text-zinc-300 uppercase tracking-wider">
                    Assinatura do Lojista
                  </Label>
                  {signatureData && (
                    <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                      Assinado
                    </span>
                  )}
                </div>

                <div className="border border-[#2a2a2a] rounded-lg bg-[#0e0e0e] overflow-hidden relative">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[200px] sm:h-[240px] cursor-crosshair touch-none"
                  />
                  {!signatureData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-700 text-xs select-none">
                      Assine aqui (Mouse ou Touchscreen)
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCanvas}
                    className="text-zinc-500 hover:text-white h-7 text-xs gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Limpar
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#2a2a2a] flex justify-end gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-[#2a2a2a] text-zinc-300 hover:bg-[#2a2a2a]"
              >
                Fechar
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="bg-aksel-600 hover:bg-aksel-700 text-white font-semibold gap-1.5"
              >
                {isExporting ? (
                  <>Gerando...</>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Gerar e Exportar PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right panel (PDF Realtime Preview) */}
          <div className="lg:col-span-8 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg p-4 flex flex-col min-h-[400px] lg:min-h-0">
            <h4 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider mb-2 shrink-0">
              Pré-visualização do Contrato
            </h4>
            <div className="flex-1 bg-[#121212] rounded border border-[#2a2a2a] overflow-auto p-4 flex justify-start lg:justify-center items-start">
              {/* Reduced scaling preview for matching visual */}
              <div className="scale-90 lg:scale-100 origin-top shrink-0 shadow-lg bg-white text-black p-8 rounded select-none relative" style={{ width: "680px", minHeight: "900px" }}>
                {/* Watermark Logo */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0">
                  <img src="/logo pdf.png" style={{ width: "65%" }} alt="Watermark" />
                </div>

                <div className="relative z-10 space-y-4">
                  {/* Whats label */}
                  <div className="text-right text-xs text-zinc-700 font-semibold">
                    whats 12 99763-0076
                  </div>

                  {/* Header Title */}
                  <div className="text-center pb-2 border-b border-black">
                    <h2 className="text-xl font-bold text-black uppercase tracking-wide">
                      Contrato de revenda em consignação
                    </h2>
                  </div>

                  {/* Customer Info Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border border-zinc-300 p-3 bg-zinc-50 rounded">
                    <div>
                      <span className="font-bold text-zinc-700">Nome: </span>
                      <span className="text-black font-semibold">{consignment.store_name}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-700">CNPJ/CPF: </span>
                      <span className="text-black font-semibold">{cnpj || "—"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-700">E-mail: </span>
                      <span className="text-black font-semibold">{email || "—"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-zinc-700">Telefone: </span>
                      <span className="text-black font-semibold">{phone || "—"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-bold text-zinc-700">Endereço: </span>
                      <span className="text-black font-semibold">{address || "—"}</span>
                    </div>
                  </div>

                  {/* Tools Table */}
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-400">
                        <th className="border border-zinc-300 p-1.5 text-center w-8">#</th>
                        <th className="border border-zinc-300 p-1.5 text-left">Ferramenta</th>
                        <th className="border border-zinc-300 p-1.5 text-left w-24">Modelo</th>
                        <th className="border border-zinc-300 p-1.5 text-center w-14">Quantidade</th>
                        <th className="border border-zinc-300 p-1.5 text-right w-20">Valor unitário</th>
                        <th className="border border-zinc-300 p-1.5 text-right w-20">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, idx: number) => {
                        const parsed = parseProductName(item.products?.name || "");
                        return (
                          <tr key={item.id} className="border-b border-zinc-200">
                            <td className="border border-zinc-300 p-1 text-center font-medium">{idx + 1}</td>
                            <td className="border border-zinc-300 p-1 text-left font-medium">{parsed.tool}</td>
                            <td className="border border-zinc-300 p-1 text-left font-semibold text-zinc-700">{parsed.model}</td>
                            <td className="border border-zinc-300 p-1 text-center font-semibold tabular-nums">{item.quantity_sent}</td>
                            <td className="border border-zinc-300 p-1 text-right font-medium tabular-nums">{formatCurrency(item.unit_price)}</td>
                            <td className="border border-zinc-300 p-1 text-right font-bold text-zinc-800 tabular-nums">
                              {formatCurrency(item.quantity_sent * item.unit_price)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-zinc-50 border-t border-zinc-400">
                        <td colSpan={3} className="border border-zinc-300 p-1 text-left font-bold text-zinc-700">Total Consignado</td>
                        <td className="border border-zinc-300 p-1 text-center font-bold tabular-nums">
                          {items.reduce((s: number, i: any) => s + i.quantity_sent, 0)}
                        </td>
                        <td className="border border-zinc-300 p-1"></td>
                        <td className="border border-zinc-300 p-1 text-right font-bold text-black tabular-nums">
                          {formatCurrency(totalValue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Declaration text */}
                  <div className="text-[10px] leading-relaxed text-zinc-800 border-t border-zinc-300 pt-3">
                    Declaro que recebi as ferramentas acima descritas, sendo o responsável pela guarda e
                    conservação dos itens recebidos, ficando acordado que a cada sexta-feira de cada semana do
                    mês será feito o pagamento das ferramentas vendidas.
                  </div>

                  {/* Signatures and Date */}
                  <div className="pt-6 flex justify-between items-end">
                    <div className="relative w-48 text-center">
                      {signatureData && (
                        <img
                          src={signatureData}
                          style={{
                            maxHeight: "45px",
                            position: "absolute",
                            bottom: "16px",
                            left: "50%",
                            transform: "translateX(-50%)",
                          }}
                          alt="Signature Preview"
                        />
                      )}
                      <div className="border-b border-black pb-0.5"></div>
                      <div className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Assinatura</div>
                    </div>

                    <div className="w-36 text-center">
                      <div className="border-b border-black pb-0.5 font-semibold text-xs text-black">
                        {formattedSentDate}
                      </div>
                      <div className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Data</div>
                    </div>
                  </div>

                  {/* Brand Logo */}
                  <div className="flex justify-end pt-4">
                    <img src="/logo.png" style={{ height: "26px" }} alt="Brand Logo" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Container for rendering exact A4 PDF scale */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div
            ref={printTemplateRef}
            style={{
              width: "800px",
              padding: "45px",
              backgroundColor: "#ffffff",
              color: "#000000",
              fontFamily: "sans-serif",
              position: "relative",
              boxSizing: "border-box",
            }}
          >
            {/* Watermark Logo */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.12,
                pointerEvents: "none",
                zIndex: 0,
              }}
            >
              <img src="/logo pdf.png" style={{ width: "65%" }} alt="Watermark" />
            </div>

            <div style={{ position: "relative", zIndex: 10 }}>
              {/* Whats label */}
              <div style={{ textAlign: "right", fontSize: "14px", fontWeight: "600", marginBottom: "15px" }}>
                whats 12 99763-0076
              </div>

              {/* Title */}
              <div style={{ textAlign: "center", paddingBottom: "10px", borderBottom: "2px solid #000000", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0, textTransform: "uppercase" }}>
                  Contrato de revenda em consignação
                </h2>
              </div>

              {/* Info grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                  fontSize: "14px",
                  border: "1px solid #ccc",
                  padding: "15px",
                  borderRadius: "4px",
                  backgroundColor: "#fcfcfc",
                  marginBottom: "25px",
                }}
              >
                <div>
                  <strong style={{ color: "#444" }}>Nome: </strong>
                  <span>{consignment.store_name}</span>
                </div>
                <div>
                  <strong style={{ color: "#444" }}>CNPJ/CPF: </strong>
                  <span>{cnpj || "—"}</span>
                </div>
                <div>
                  <strong style={{ color: "#444" }}>E-mail: </strong>
                  <span>{email || "—"}</span>
                </div>
                <div>
                  <strong style={{ color: "#444" }}>Telefone: </strong>
                  <span>{phone || "—"}</span>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <strong style={{ color: "#444" }}>Endereço: </strong>
                  <span>{address || "—"}</span>
                </div>
              </div>

              {/* Tools Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "35px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0", borderBottom: "2px solid #000" }}>
                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center", width: "40px" }}>#</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left" }}>Ferramenta</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left", width: "120px" }}>Modelo</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center", width: "80px" }}>Quantidade</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right", width: "100px" }}>Valor unitário</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right", width: "100px" }}>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => {
                    const parsed = parseProductName(item.products?.name || "");
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left" }}>{parsed.tool}</td>
                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left", fontWeight: "600" }}>{parsed.model}</td>
                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center", fontWeight: "600" }}>{item.quantity_sent}</td>
                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>{formatCurrency(item.unit_price)}</td>
                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right", fontWeight: "bold" }}>
                          {formatCurrency(item.quantity_sent * item.unit_price)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: "#fbfbfb", borderTop: "2px solid #ccc" }}>
                    <td colSpan={3} style={{ border: "1px solid #ccc", padding: "8px", fontWeight: "bold" }}>Total Consignado</td>
                    <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center", fontWeight: "bold" }}>
                      {items.reduce((s: number, i: any) => s + i.quantity_sent, 0)}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "8px" }}></td>
                    <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right", fontWeight: "bold" }}>
                      {formatCurrency(totalValue)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Declaration */}
              <div style={{ fontSize: "12px", lineHeight: "1.6", color: "#333", borderTop: "1px solid #ccc", paddingTop: "15px", marginBottom: "40px" }}>
                Declaro que recebi as ferramentas acima descritas, sendo o responsável pela guarda e
                conservação dos itens recebidos, ficando acordado que a cada sexta-feira de cada semana do
                mês será feito o pagamento das ferramentas vendidas.
              </div>

              {/* Signature block */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "40px", marginBottom: "40px" }}>
                <div style={{ position: "relative", width: "250px", textAlign: "center" }}>
                  {signatureData && (
                    <img
                      src={signatureData}
                      style={{
                        maxHeight: "65px",
                        position: "absolute",
                        bottom: "22px",
                        left: "50%",
                        transform: "translateX(-50%)",
                      }}
                      alt="Signature"
                    />
                  )}
                  <div style={{ borderBottom: "1px solid #000", paddingBottom: "2px" }}></div>
                  <div style={{ fontSize: "11px", color: "#555", fontWeight: "bold", textTransform: "uppercase", marginTop: "5px" }}>
                    Assinatura
                  </div>
                </div>

                <div style={{ width: "180px", textAlign: "center" }}>
                  <div style={{ borderBottom: "1px solid #000", paddingBottom: "2px", fontWeight: "600", fontSize: "14px" }}>
                    {formattedSentDate}
                  </div>
                  <div style={{ fontSize: "11px", color: "#555", fontWeight: "bold", textTransform: "uppercase", marginTop: "5px" }}>
                    Data
                  </div>
                </div>
              </div>

              {/* Brand Logo */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "40px" }}>
                <img src="/logo.png" style={{ height: "36px" }} alt="Brand Logo" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
