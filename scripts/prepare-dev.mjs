import fs from "node:fs";
import path from "node:path";

// `next build` ve `next dev` aynı .next klasörünü kullanır. Üretim derlemesinden
// kalan BUILD_ID ile dev sunucusu başlarsa Tarayıcıdaki HMR istemcisi her istekte
// tam sayfa yenileme döngüsüne girebiliyor. Bu yüzden yalnızca üretim çıktısı
// varsa .next temizlenir; normal dev yeniden başlatmaları önbelleği korur.
const nextDir = path.join(process.cwd(), ".next");
const buildId = path.join(nextDir, "BUILD_ID");

if (fs.existsSync(buildId)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Üretim derlemesi (.next) temizlendi; geliştirme önbelleği yeniden oluşturulacak.");
}
