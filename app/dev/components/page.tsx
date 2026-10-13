'use client';
// หน้าตรวจ component เทียบ Design System (ใช้ระหว่างพัฒนา)
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, DarkCard, LabelValue } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { Icon } from '@/components/ui/Icon';

const CITY_OPTIONS = [
  { value: '', label: 'ทุกเมือง' },
  { value: 'lp', label: 'หลวงพระบาง' },
  { value: 'vte', label: 'เวียงจันทน์' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[14px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentsPage() {
  const toast = useToast();
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-8 p-4 md:p-8">
      <h1 className="text-h2">Components · HUGMAP</h1>

      <Section title="ปุ่ม">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button iconAfter="arrow_forward">ดูสรุปเส้นทาง</Button>
          <Button variant="outline" icon="link">คัดลอกลิงก์ลูกค้า</Button>
          <Button variant="soft">+ เพิ่ม</Button>
          <IconButton icon="auto_awesome" label="จัดลำดับอัตโนมัติ" />
          <IconButton variant="primary" icon="add_location_alt" label="เพิ่มสถานที่" />
          <Button variant="danger">ลบ</Button>
          <Button onClick={() => toast('คัดลอกลิงก์แล้ว')}>แสดง Toast</Button>
        </div>
      </Section>

      <Section title="ช่องกรอก + ตัวกรอง">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Input label="ชื่อสถานที่" required defaultValue="วัดเชียงทอง" />
            <Input label="ละติจูด" defaultValue="12.5" error="พิกัดอยู่นอกขอบเขต สปป.ลาว (ละติจูด 13.9–22.5, ลองจิจูด 100.0–107.7)" />
            <Select label="เมือง" options={CITY_OPTIONS} />
            <div className="flex flex-wrap gap-2">
              <Select variant="pill" aria-label="เมือง" options={CITY_OPTIONS} />
            </div>
          </div>
          <Card>
            <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3 px-4 py-3.5">
              <div>
                <div className="text-label">วัด · หลวงพระบาง</div>
                <div className="mt-0.5 text-title">วัดเชียงทอง</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-item bg-brand-soft text-brand">
                <Icon name="temple_buddhist" className="text-[22px]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 border-t border-line px-4 pb-3 pt-2.5">
              <LabelValue label="เวลาเปิด">08:00–17:00</LabelValue>
              <LabelValue label="ค่าเข้า">20,000 กีบ</LabelValue>
              <LabelValue label="เวลาแนะนำ">
                45 นาที <Pill small>ในทริป</Pill>
              </LabelValue>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Pill">
        <div className="flex flex-wrap gap-2">
          <Pill>ในทริป · ห่าง 90 ม.</Pill>
          <Pill tone="warning">ว่าง 4 ชม.</Pill>
          <Pill tone="brand">TR-2569-118</Pill>
          <Pill tone="danger">ปิดก่อนเวลาออก</Pill>
        </div>
      </Section>

      <Section title="การ์ดลอยเขียวเข้ม">
        <DarkCard className="flex max-w-[280px] flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-[52px] w-[52px] place-items-center rounded-input bg-brand">
              <Icon name="route" className="text-[26px]" />
            </div>
            <div>
              <div className="text-[12px] text-dark-muted">วันที่ 1 · 5 จุด</div>
              <div className="text-[18px] font-bold">16 นาที <span className="text-[14px] font-medium">(3.6 กม.)</span></div>
            </div>
          </div>
          <Button variant="light">ดูสรุปเส้นทาง</Button>
        </DarkCard>
      </Section>
    </div>
  );
}
