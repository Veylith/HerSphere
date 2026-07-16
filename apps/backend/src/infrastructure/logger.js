export function createLogger() {
  return {
    info(entry) {
      console.log(JSON.stringify({ level: "info", time: new Date().toISOString(), ...entry }));
    },
    error(entry) {
      console.error(JSON.stringify({ level: "error", time: new Date().toISOString(), ...entry }));
    }
  };
}
