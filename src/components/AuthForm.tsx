"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Rocket, Loader2, Check, ShieldCheck } from "lucide-react";
import { publicFeatures } from "@/lib/env";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 확장 가입 필드
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  async function sendOtp() {
    setOtpMsg("");
    setOtpSending(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "전송 실패");
      setOtpSent(true);
      if (d.mode === "kakao") {
        setOtpMsg("카카오톡으로 인증번호를 전송했습니다. 3분 안에 입력해 주세요.");
      } else if (d.mode === "sms") {
        setOtpMsg("문자로 인증번호를 전송했습니다. 3분 안에 입력해 주세요.");
      } else if (d.devCode) {
        setOtpMsg(`테스트 모드입니다. 인증번호: ${d.devCode} (카카오/문자 키 연결 시 실제 발송)`);
      } else {
        setOtpMsg("전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch (e) {
      setOtpMsg(e instanceof Error ? e.message : "전송 중 오류");
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyOtp() {
    setOtpMsg("");
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "인증 실패");
      setPhoneVerified(true);
      setOtpMsg("휴대폰 인증이 완료되었습니다.");
    } catch (e) {
      setOtpMsg(e instanceof Error ? e.message : "인증 중 오류");
    }
  }

  async function handleSupabase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const name = String(fd.get("name") || "");

    if (isSignup && !phoneVerified) {
      setError("휴대폰 인증을 완료해 주세요.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowser();
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setError("가입 확인 메일을 보냈습니다. 메일에서 인증한 뒤 로그인해 주세요.");
          setLoading(false);
          return;
        }
        if (data.user) {
          await supabase
            .from("profiles")
            .update({
              name: name || email.split("@")[0],
              phone: phone.replace(/[^0-9]/g, ""),
              birthdate: String(fd.get("birthdate") || "") || null,
              gender: String(fd.get("gender") || "") || null,
              address: String(fd.get("address") || "") || null,
              phone_verified: true,
            })
            .eq("id", data.user.id);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white">
          <Rocket className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {isSignup ? "회원가입" : "다시 오신 걸 환영합니다"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">딥테크 플래너 · AI 기술기획 · 사업계획서</p>
      </div>

      <div className="card p-6">
        {!publicFeatures.supabase && (
          <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            데모 모드입니다. 이메일만 입력하면 바로 체험할 수 있어요. (Supabase 키를 연결하면 실제 계정으로 동작)
          </div>
        )}

        {publicFeatures.supabase ? (
          <form onSubmit={handleSupabase} className="space-y-4">
            {isSignup && (
              <div>
                <label className="label">이름</label>
                <input name="name" className="input" placeholder="홍길동" />
              </div>
            )}
            <div>
              <label className="label">이메일</label>
              <input name="email" type="email" required className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">비밀번호</label>
              <input name="password" type="password" required minLength={6} className="input" placeholder="••••••••" />
            </div>

            {isSignup && (
              <>
                {/* 휴대폰 인증 */}
                <div>
                  <label className="label">휴대폰 번호</label>
                  <div className="flex gap-2">
                    <input
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setPhoneVerified(false);
                      }}
                      disabled={phoneVerified}
                      className="input"
                      placeholder="01012345678"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={otpSending || phoneVerified || phone.replace(/[^0-9]/g, "").length < 10}
                      className="btn-outline shrink-0"
                    >
                      {otpSending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {otpSent ? "재전송" : "인증번호 받기"}
                    </button>
                  </div>
                </div>

                {otpSent && !phoneVerified && (
                  <div>
                    <label className="label">인증번호</label>
                    <div className="flex gap-2">
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="input"
                        placeholder="6자리 숫자"
                        inputMode="numeric"
                        maxLength={6}
                      />
                      <button type="button" onClick={verifyOtp} className="btn-primary shrink-0">
                        확인
                      </button>
                    </div>
                  </div>
                )}

                {phoneVerified && (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <ShieldCheck className="h-4 w-4" /> 휴대폰 인증 완료
                  </p>
                )}
                {otpMsg && !phoneVerified && <p className="text-xs text-slate-500">{otpMsg}</p>}

                {/* 추가 정보 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">생년월일</label>
                    <input name="birthdate" type="date" className="input" />
                  </div>
                  <div>
                    <label className="label">성별</label>
                    <select name="gender" className="input" defaultValue="">
                      <option value="">선택</option>
                      <option value="male">남성</option>
                      <option value="female">여성</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">집주소</label>
                  <input name="address" className="input" placeholder="예: 서울시 강남구 …" />
                </div>
              </>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || (isSignup && !phoneVerified)}
              className="btn-primary w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignup ? (phoneVerified ? "가입하기" : "휴대폰 인증 후 가입 가능") : "로그인"}
              {isSignup && phoneVerified && !loading && <Check className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <form action="/api/auth/demo" method="post" className="space-y-4">
            {isSignup && (
              <div>
                <label className="label">이름</label>
                <input name="name" className="input" placeholder="홍길동" />
              </div>
            )}
            <div>
              <label className="label">이메일</label>
              <input name="email" type="email" required className="input" placeholder="you@example.com" />
            </div>
            <button type="submit" className="btn-primary w-full">
              {isSignup ? "체험 시작하기" : "데모 로그인"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-slate-500">
          {isSignup ? (
            <>
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="font-semibold text-brand-600">
                로그인
              </Link>
            </>
          ) : (
            <>
              계정이 없으신가요?{" "}
              <Link href="/signup" className="font-semibold text-brand-600">
                회원가입
              </Link>
            </>
          )}
        </p>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/" className="text-slate-400 hover:text-slate-600">
          ← 홈으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
