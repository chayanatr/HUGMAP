export default function ShareNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-[13px] font-bold tracking-[.08em] text-brand-hover">HUGMAP</div>
      <h1 className="text-h2">ไม่พบลิงก์นี้</h1>
      <p className="text-[14px] leading-[1.6] text-muted">ลิงก์อาจไม่ถูกต้องหรือถูกยกเลิกแล้ว กรุณาติดต่อบริษัททัวร์ของท่านเพื่อขอลิงก์ใหม่</p>
    </div>
  );
}
