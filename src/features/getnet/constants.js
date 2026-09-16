export const ESTABLECIMIENTOS = {
  DCG1: 'Ayrton Gil',
  DCG2: 'Jacqueline Muñoz',
  DCG3: 'Pamela Esquivel',
  DCG4: 'Martin Costa',
  DCG5: 'Lucas Balmaceda',
  DCG6: 'Romina Gil',
  DCG7: 'Jose Castro',
  DCG8: 'Seba Mas',
  DCG9: 'Pets Company'
};

export const ESTABLECIMIENTOS_OPTIONS = Object.entries(ESTABLECIMIENTOS).map(
  ([dcg, propietario]) => ({
    label: `${dcg} — ${propietario}`,
    value: dcg
  })
);

export const ESTADOS_RECHAZADOS = ['rechazada', 'rechazado'];
