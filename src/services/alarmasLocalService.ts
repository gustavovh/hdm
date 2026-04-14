import { supabase } from '../lib/supabase';

const ALARM_CHECK_INTERVAL_MS = 60 * 1000;

let intervalId: number | null = null;
let isRunning = false;

function extractProcesadas(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;

  const maybeData = data as { procesadas?: unknown };
  const value = Number(maybeData.procesadas ?? 0);

  return Number.isFinite(value) ? value : 0;
}

async function processDueAlarms() {
  if (isRunning) return;
  isRunning = true;

  try {
    const { data, error } = await supabase.rpc('procesar_alarmas_locales');

    if (error) {
      if (/does not exist/i.test(error.message || '')) {
        console.warn('La funcion procesar_alarmas_locales no existe. Scheduler local detenido.');
        stopLocalAlarmScheduler();
        return;
      }
      throw error;
    }

    const procesadas = extractProcesadas(data);
    if (procesadas > 0) {
      console.log(`[ALARMAS-LOCAL] Procesadas ${procesadas} alarmas vencidas`);
    }
  } catch (err) {
    console.error('Error procesando alarmas locales:', err);
  } finally {
    isRunning = false;
  }
}

export function startLocalAlarmScheduler() {
  if (intervalId !== null) return;

  void processDueAlarms();
  intervalId = window.setInterval(processDueAlarms, ALARM_CHECK_INTERVAL_MS);
}

export function stopLocalAlarmScheduler() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}
