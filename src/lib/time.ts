export const formatIST = (date: Date = new Date()): string => {
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
      const formatter = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      return `${formatter.format(date)} IST`;
    }
  } catch {
    // Fallback below
  }
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(
    ist.getDate()
  )} ${pad(ist.getHours())}:${pad(ist.getMinutes())} IST`;
};

export const getISTNow = (): string => formatIST(new Date());
