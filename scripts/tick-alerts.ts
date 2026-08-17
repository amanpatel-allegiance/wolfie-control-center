/** CLI wrapper for the alert engine — useful for local testing. */
import { runAlertTick } from "@/lib/alerts";

runAlertTick().then((s) => {
  console.log(JSON.stringify(s, null, 2));
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
