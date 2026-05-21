/**
 * Toolbox — category-specific helper widgets that ride along with a
 * challenge page. Collapsible (collapsed by default so students see the
 * scenario first, not a wall of tools).
 *
 * Tools render entirely client-side and never persist beyond the page —
 * they're calculators / reference tables, not state. Each tool is a tiny
 * self-contained block so adding a new one is a copy-paste-tweak.
 */
import { useState } from "react";
import {
  Wrench,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Globe,
  Binary,
  Clock,
  Network,
  Calculator,
} from "lucide-react";
import type { CtfCategory } from "@/constants/ctfChallenges";

interface ToolboxProps {
  category: CtfCategory;
  /** Initial expand state for the collapsible chrome. Ignored when hideHeader=true. */
  defaultExpanded?: boolean;
  /** If true, render only the tools — no header, no collapse. Used inside the
   *  mobile drawer where the drawer tabs already provide the collapse UX. */
  hideHeader?: boolean;
  /** Optional click target rendered next to the header (e.g. "What is the toolbox?"). */
  headerSlot?: React.ReactNode;
}

function CategoryTools({ category }: { category: CtfCategory }) {
  if (category === "cryptography") return <CryptographyTools />;
  if (category === "web") return <WebTools />;
  if (category === "forensics") return <ForensicsTools />;
  return <NetworkTools />;
}

export default function Toolbox({
  category,
  defaultExpanded = false,
  hideHeader = false,
  headerSlot,
}: ToolboxProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (hideHeader) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <CategoryTools category={category} />
      </div>
    );
  }

  return (
    <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80"
        >
          <Wrench className="w-4 h-4 text-indigo-700 dark:text-indigo-300 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Toolbox
          </span>
          <span className="text-xs text-indigo-700/80 dark:text-indigo-300/70 hidden sm:inline">
            tools for this challenge
          </span>
          {expanded ? (
            <ChevronUp className="ml-auto w-4 h-4 text-indigo-700 dark:text-indigo-300" />
          ) : (
            <ChevronDown className="ml-auto w-4 h-4 text-indigo-700 dark:text-indigo-300" />
          )}
        </button>
        {headerSlot && <div className="ml-2 shrink-0">{headerSlot}</div>}
      </div>

      {expanded && (
        <div className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4">
          <CategoryTools category={category} />
        </div>
      )}
    </div>
  );
}

// ── Reusable presentational blocks ──────────────────────────────────────

function ToolCard({
  title,
  Icon,
  children,
  hint,
}: {
  title: string;
  Icon: typeof Wrench;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
        <Icon className="w-4 h-4" />
        {title}
      </p>
      <div className="space-y-2">{children}</div>
      {hint && (
        <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-2">
          {hint}
        </p>
      )}
    </div>
  );
}

function OutputBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded p-2">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
        {label}
      </p>
      <pre className="font-mono text-sm text-emerald-900 dark:text-emerald-100 break-all whitespace-pre-wrap">
        {value || "(output will appear here)"}
      </pre>
    </div>
  );
}

// ─── Cryptography ───────────────────────────────────────────────────────

function CryptographyTools() {
  return (
    <>
      <CaesarTool />
      <Base64Tool />
      <HexTool />
      <ReverseTool />
      <AlphabetReference />
    </>
  );
}

function CaesarTool() {
  const [input, setInput] = useState("");
  const [shift, setShift] = useState(3);

  const decode = (text: string, n: number) =>
    text
      .split("")
      .map((ch) => {
        const code = ch.charCodeAt(0);
        if (code >= 65 && code <= 90) {
          return String.fromCharCode(((code - 65 - n + 26) % 26) + 65);
        }
        if (code >= 97 && code <= 122) {
          return String.fromCharCode(((code - 97 - n + 26) % 26) + 97);
        }
        return ch;
      })
      .join("");

  return (
    <ToolCard
      title="Caesar Cipher Decoder"
      Icon={RotateCw}
      hint="Slide the shift until readable English appears."
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste encoded text…"
        rows={2}
        spellCheck={false}
        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-1 focus:ring-indigo-500"
      />
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-600 dark:text-slate-400 shrink-0">
          Shift back by
        </label>
        <input
          type="range"
          min="1"
          max="25"
          value={shift}
          onChange={(e) => setShift(parseInt(e.target.value, 10))}
          aria-label="Shift amount"
          className="flex-1"
        />
        <span className="text-sm font-mono text-slate-900 dark:text-slate-100 w-8 text-center">
          {shift}
        </span>
      </div>
      <OutputBox label="Decoded" value={input ? decode(input, shift) : ""} />
    </ToolCard>
  );
}

function Base64Tool() {
  const [input, setInput] = useState("");
  let decoded = "";
  if (input) {
    try {
      decoded = atob(input.trim());
    } catch {
      decoded = "(invalid base64)";
    }
  }
  return (
    <ToolCard title="Base64 Decoder" Icon={Binary}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste base64 string…"
        rows={2}
        spellCheck={false}
        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-1 focus:ring-indigo-500"
      />
      <OutputBox label="Decoded" value={decoded} />
    </ToolCard>
  );
}

function HexTool() {
  const [hex, setHex] = useState("");

  const decode = (h: string) => {
    const cleaned = h.replace(/\s+/g, "");
    if (cleaned.length === 0) return "";
    if (cleaned.length % 2 !== 0) return "(invalid: needs even hex chars)";
    let result = "";
    for (let i = 0; i < cleaned.length; i += 2) {
      const byte = parseInt(cleaned.slice(i, i + 2), 16);
      if (isNaN(byte)) return "(invalid hex)";
      result += String.fromCharCode(byte);
    }
    return result;
  };

  return (
    <ToolCard
      title="Hex → ASCII"
      Icon={Binary}
      hint="Pairs of hex characters become ASCII bytes. Spaces are ignored."
    >
      <textarea
        value={hex}
        onChange={(e) => setHex(e.target.value)}
        placeholder="Paste hex string (e.g. 48656c6c6f)…"
        rows={2}
        spellCheck={false}
        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-1 focus:ring-indigo-500"
      />
      <OutputBox label="ASCII" value={decode(hex)} />
    </ToolCard>
  );
}

function ReverseTool() {
  const [input, setInput] = useState("");
  return (
    <ToolCard title="Reverse String" Icon={RotateCw}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type or paste text…"
        rows={2}
        spellCheck={false}
        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-1 focus:ring-indigo-500"
      />
      <OutputBox label="Reversed" value={input.split("").reverse().join("")} />
    </ToolCard>
  );
}

function AlphabetReference() {
  return (
    <ToolCard title="Alphabet Position" Icon={Calculator}>
      <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 text-center font-mono text-xs">
        {Array.from({ length: 26 }, (_, i) => (
          <div
            key={i}
            className="bg-slate-100 dark:bg-slate-800 rounded px-1 py-1"
          >
            <div className="text-slate-900 dark:text-slate-100 font-semibold">
              {String.fromCharCode(65 + i)}
            </div>
            <div className="text-slate-500 dark:text-slate-500 text-[10px]">
              {i + 1}
            </div>
          </div>
        ))}
      </div>
    </ToolCard>
  );
}

// ─── Web ────────────────────────────────────────────────────────────────

function WebTools() {
  return (
    <>
      <UrlTool />
      <Base64Tool />
      <HttpHeadersReference />
    </>
  );
}

function UrlTool() {
  const [input, setInput] = useState("");
  let decoded = "";
  if (input) {
    try {
      decoded = decodeURIComponent(input);
    } catch {
      decoded = "(invalid URL encoding)";
    }
  }
  return (
    <ToolCard title="URL Decoder" Icon={Globe}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste URL-encoded text…"
        rows={2}
        spellCheck={false}
        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-1 focus:ring-indigo-500"
      />
      <OutputBox label="Decoded" value={decoded} />
    </ToolCard>
  );
}

function HttpHeadersReference() {
  const rows: Array<[string, string]> = [
    ["Authorization", "login credentials (Bearer / Basic)"],
    ["Cookie", "session and auth tokens"],
    ["User-Agent", "identifies the browser / client"],
    ["Referer", "the page that linked here"],
    ["Content-Type", "format of the request body"],
    ["Set-Cookie", "server tells the browser to store a cookie"],
  ];
  return (
    <ToolCard title="Common HTTP Headers" Icon={Globe}>
      <table className="w-full text-xs font-mono">
        <tbody>
          {rows.map(([name, desc]) => (
            <tr key={name}>
              <td className="text-cyan-700 dark:text-cyan-300 pr-2 align-top whitespace-nowrap">
                {name}:
              </td>
              <td className="text-slate-700 dark:text-slate-300">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ToolCard>
  );
}

// ─── Forensics ──────────────────────────────────────────────────────────

function ForensicsTools() {
  return (
    <>
      <HexTool />
      <FileSignaturesReference />
      <TimestampTool />
    </>
  );
}

function FileSignaturesReference() {
  const rows: Array<[string, string]> = [
    ["89 50 4E 47", "PNG"],
    ["FF D8 FF", "JPEG"],
    ["50 4B 03 04", "ZIP / DOCX / XLSX"],
    ["25 50 44 46", "PDF"],
    ["47 49 46 38", "GIF"],
    ["42 4D", "BMP"],
    ["52 61 72 21", "RAR"],
    ["7F 45 4C 46", "ELF (Linux executable)"],
    ["4D 5A", "EXE (Windows executable)"],
  ];
  return (
    <ToolCard
      title="File Magic Numbers"
      Icon={Binary}
      hint="The first few bytes of any file declare its real format, regardless of extension."
    >
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-slate-500 dark:text-slate-500">
            <th className="text-left pb-1">Hex</th>
            <th className="text-left pb-1">Format</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([hex, fmt]) => (
            <tr key={hex}>
              <td className="text-cyan-700 dark:text-cyan-300 pr-3">{hex}</td>
              <td className="text-slate-700 dark:text-slate-300">{fmt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ToolCard>
  );
}

function TimestampTool() {
  const [input, setInput] = useState("");
  let readable = "";
  if (input) {
    const trimmed = input.trim();
    const num = Number(trimmed);
    if (Number.isFinite(num) && num > 0) {
      // Heuristic: 10 digits → seconds; otherwise ms.
      const ms = trimmed.length <= 10 ? num * 1000 : num;
      const date = new Date(ms);
      readable = isNaN(date.getTime()) ? "(invalid)" : date.toISOString();
    } else {
      readable = "(enter a number)";
    }
  }
  return (
    <ToolCard
      title="Unix Timestamp Converter"
      Icon={Clock}
      hint="10-digit input is read as seconds, 13-digit as milliseconds."
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Unix timestamp (seconds or ms)…"
        inputMode="numeric"
        spellCheck={false}
        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-1 focus:ring-indigo-500"
      />
      <OutputBox label="UTC date" value={readable} />
    </ToolCard>
  );
}

// ─── Networks ───────────────────────────────────────────────────────────

function NetworkTools() {
  return (
    <>
      <PortReference />
      <CidrTool />
    </>
  );
}

function PortReference() {
  const rows: Array<[string, string]> = [
    ["22", "SSH (secure shell)"],
    ["23", "Telnet (insecure)"],
    ["25", "SMTP (email)"],
    ["53", "DNS"],
    ["80", "HTTP (web)"],
    ["110", "POP3 (email)"],
    ["143", "IMAP (email)"],
    ["443", "HTTPS (secure web)"],
    ["3306", "MySQL"],
    ["3389", "RDP (remote desktop)"],
    ["5432", "PostgreSQL"],
    ["6666", "IRC (chat) — unusual for web servers!"],
    ["8080", "HTTP alt"],
  ];
  return (
    <ToolCard title="Common Ports" Icon={Network}>
      <table className="w-full text-xs font-mono">
        <tbody>
          {rows.map(([port, desc]) => (
            <tr key={port}>
              <td className="text-cyan-700 dark:text-cyan-300 pr-3 align-top w-12">
                {port}
              </td>
              <td className="text-slate-700 dark:text-slate-300">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ToolCard>
  );
}

interface CidrResult {
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  hostCount: number;
}

function computeCidr(input: string): CidrResult | string {
  const m = input.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!m) return "(format: 10.0.0.0/24)";
  const o = [m[1], m[2], m[3], m[4]].map(Number);
  const prefix = Number(m[5]);
  if (o.some((n) => n < 0 || n > 255) || prefix < 0 || prefix > 32) {
    return "(invalid CIDR — octets 0-255, prefix 0-32)";
  }
  const ip = ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = ip & mask;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const hostCount = prefix >= 31 ? 0 : broadcast - network - 1;
  const fmt = (n: number) =>
    [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join(".");
  return {
    network: fmt(network),
    broadcast: fmt(broadcast),
    firstHost: prefix >= 31 ? fmt(network) : fmt(network + 1),
    lastHost: prefix >= 31 ? fmt(broadcast) : fmt(broadcast - 1),
    hostCount,
  };
}

function CidrTool() {
  const [input, setInput] = useState("");
  const result = input ? computeCidr(input) : null;
  const isErr = typeof result === "string";
  return (
    <ToolCard
      title="CIDR Calculator"
      Icon={Calculator}
      hint="Enter a network like 192.168.1.0/24 to see its range."
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. 10.0.0.0/24"
        spellCheck={false}
        className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-1 focus:ring-indigo-500"
      />
      {result && isErr && (
        <OutputBox label="Result" value={result as string} />
      )}
      {result && !isErr && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded p-2 text-xs font-mono">
          <table className="w-full">
            <tbody className="text-emerald-900 dark:text-emerald-100">
              <tr>
                <td className="text-emerald-700 dark:text-emerald-400 pr-3">Network</td>
                <td>{(result as CidrResult).network}</td>
              </tr>
              <tr>
                <td className="text-emerald-700 dark:text-emerald-400 pr-3">Broadcast</td>
                <td>{(result as CidrResult).broadcast}</td>
              </tr>
              <tr>
                <td className="text-emerald-700 dark:text-emerald-400 pr-3">First host</td>
                <td>{(result as CidrResult).firstHost}</td>
              </tr>
              <tr>
                <td className="text-emerald-700 dark:text-emerald-400 pr-3">Last host</td>
                <td>{(result as CidrResult).lastHost}</td>
              </tr>
              <tr>
                <td className="text-emerald-700 dark:text-emerald-400 pr-3">Hosts</td>
                <td>{(result as CidrResult).hostCount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </ToolCard>
  );
}
