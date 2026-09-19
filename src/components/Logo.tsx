import { Link } from "react-router-dom";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-1.5">
      <span className="grid h-7 w-7 place-items-center rounded-[6px] bg-[#E11D2E] text-[15px] font-black text-white">
        B
      </span>
      <span
        className={`text-[22px] font-extrabold tracking-tight ${light ? "text-white" : "text-neutral-900"}`}
      >
        blind
      </span>
    </Link>
  );
}
