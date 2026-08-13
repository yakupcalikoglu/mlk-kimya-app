// Modal overlay'e tıklanınca kapatma davranışını doğru şekilde yönetir.
// Sorun: kullanıcı modal içindeki bir metni fare ile seçerken (örn. cari adını
// değiştirmek için) imleç modal kutusunun dışına taşarsa, mouseup/click olayı
// overlay üzerinde tetiklenip modalı yanlışlıkla kapatıyordu. Çözüm: sadece
// mousedown VE click'in İKİSİ DE doğrudan overlay üzerinde başladıysa kapat —
// metin seçimi gibi sürükleme hareketlerinde mousedown modal kutusunun İÇİNDE
// başladığı için artık modal kapanmıyor.
export function overlayProps(onClose: () => void) {
  let mouseDownOnSelf = false
  return {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      mouseDownOnSelf = e.target === e.currentTarget
    },
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      if (mouseDownOnSelf && e.target === e.currentTarget) onClose()
    },
  }
}
