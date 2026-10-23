-- รูปสถานที่: ไฟล์ละไม่เกิน 15 MB (รูปใหญ่ถูกย่อที่ฝั่งเบราว์เซอร์ก่อนอัปโหลด); จำนวนรูปต่อสถานที่จำกัดที่แอป (10 รูป)
update storage.buckets set file_size_limit = 15728640 where id = 'place-photos';
