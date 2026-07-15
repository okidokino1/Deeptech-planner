import { ShieldAlert } from "lucide-react";

export function CrmNotice() {
  return (
    <div className="card p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-amber-400" />
      <p className="mt-3 font-semibold text-slate-800">CRM은 Supabase 연결 시 활성화됩니다.</p>
      <p className="mt-1 text-sm text-slate-500">
        현재는 데모 모드라 회원·매출 데이터가 없습니다. Supabase 키를 등록하면
        <br />
        회원 관리·KPI·매출 분석·기관 관리가 모두 실제 데이터로 동작합니다.
      </p>
    </div>
  );
}
