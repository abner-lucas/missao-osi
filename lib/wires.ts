// Each OSI layer is drawn as one wire of a T568B twisted-pair cable:
// layers 1–4 are the solid wires, 5–7 the white-striped ones.
type Wire = { base: string; striped: boolean; name: string };

const WIRES: Record<number, Wire> = {
  1: { base: '#e1701f', striped: false, name: 'laranja' },
  2: { base: '#2c9a57', striped: false, name: 'verde' },
  3: { base: '#2e62c9', striped: false, name: 'azul' },
  4: { base: '#8a5636', striped: false, name: 'marrom' },
  5: { base: '#e1701f', striped: true, name: 'branco-laranja' },
  6: { base: '#2c9a57', striped: true, name: 'branco-verde' },
  7: { base: '#2e62c9', striped: true, name: 'branco-azul' },
};

const INTEGRATOR: Wire = { base: '#1b2430', striped: false, name: 'integrador' };

export function wireOf(layer: number): Wire {
  return WIRES[layer] || INTEGRATOR;
}

export function wireColor(layer: number): string {
  return wireOf(layer).base;
}

// CSS background for a horizontal wire swatch
export function wireBackground(layer: number, direction: 'horizontal' | 'vertical' = 'horizontal'): string {
  const w = wireOf(layer);
  if (!w.striped) return w.base;
  const angle = direction === 'horizontal' ? '115deg' : '25deg';
  return `repeating-linear-gradient(${angle}, ${w.base} 0 7px, #ffffff 7px 12px)`;
}
