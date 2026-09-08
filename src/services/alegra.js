import { api } from './api';

export async function getAlegraContacts() {
  return api.getAlegraContacts();
}

export async function getAlegraInvoices() {
  return api.getAlegraInvoices();
}

export async function getEstadoCuenta(clienteId) {
  return api.getAlegraEstadoCuenta(clienteId);
}
