// "วันที่ที่เลือกอยู่" ของแต่ละทริป จำไว้ในเบราว์เซอร์ เพื่อให้หน้าสถานที่ ("+ เพิ่มในวันที่ N") และหน้าจัดเส้นทางตรงกัน
// เป็นแค่ความสะดวกของผู้ใช้แต่ละเครื่อง — อ่าน/เขียนไม่ได้ (เช่น โหมดส่วนตัว) ก็ใช้วันที่ 1 ได้ตามปกติ
const key = (tripId: string) => `hugmap.day.${tripId}`;

export function getSavedDay(tripId: string): number | null {
  try {
    const n = Number(window.localStorage.getItem(key(tripId)));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function saveDay(tripId: string, dayNo: number) {
  try {
    window.localStorage.setItem(key(tripId), String(dayNo));
  } catch {
    /* ไม่มี localStorage — ข้าม */
  }
}
