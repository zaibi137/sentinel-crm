import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private readonly STORAGE_KEY = 'crm_customers';

  constructor() {
    this.initStorage();
  }

  private initStorage(): void {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      const initialCustomers = [
        {
          id: 'cust-101',
          name: 'Acme Corporation',
          email: 'contact@acme.com',
          phone: '+1 555-0192',
          group: 'Enterprise',
          salespersonId: 'usr-1',
          assignedSalespersonName: 'Admin User',
          contacts: [
            { id: 'cnt-1', name: 'John Doe', email: 'john@acme.com', phone: '123456789' }
          ]
        },
        {
          id: 'cust-102',
          name: 'Global Tech Solutions',
          email: 'info@globaltech.com',
          phone: '+1 555-0198',
          group: 'Corporate',
          salespersonId: 'usr-2',
          assignedSalespersonName: 'Sarah Jenkins',
          contacts: []
        }
      ];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialCustomers));
    }
  }

  private getStoredCustomers(): any[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveCustomers(customers: any[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(customers));
  }

  getCustomers(
    pageNumber: number = 1, 
    pageSize: number = 100, 
    search: string = '', 
    group: string = '', 
    salespersonId: string = ''
  ): Observable<any> {
    let customers = this.getStoredCustomers();

    if (search && search.trim()) {
      const term = search.toLowerCase().trim();
      customers = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    }

    if (group && group.trim()) {
      customers = customers.filter(c => c.group === group);
    }

    if (salespersonId && salespersonId.trim()) {
      customers = customers.filter(c => c.salespersonId === salespersonId);
    }

    const startIndex = (pageNumber - 1) * pageSize;
    const paginatedItems = customers.slice(startIndex, startIndex + pageSize);

    return of({
      items: paginatedItems,
      data: paginatedItems, // Handles both list structures if components access .data or .items
      totalCount: customers.length,
      pageNumber,
      pageSize
    });
  }

  addCustomer(customerData: any): Observable<any> {
    const customers = this.getStoredCustomers();
    const newCustomer = {
      ...customerData,
      id: customerData.id || `cust-${Date.now()}`,
      contacts: customerData.contacts || []
    };
    customers.unshift(newCustomer);
    this.saveCustomers(customers);
    return of({ success: true, data: newCustomer });
  }

  updateCustomer(id: string, customerData: any): Observable<any> {
    const customers = this.getStoredCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...customerData, id };
      this.saveCustomers(customers);
      return of({ success: true, data: customers[index] });
    }
    return of({ success: false, message: 'Customer not found' });
  }

  deleteCustomer(id: string): Observable<any> {
    let customers = this.getStoredCustomers();
    customers = customers.filter(c => c.id !== id);
    this.saveCustomers(customers);
    return of({ success: true, message: 'Customer deleted successfully' });
  }

  addContact(customerId: string, contact: any): Observable<any> {
    const customers = this.getStoredCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      if (!customer.contacts) customer.contacts = [];
      const newContact = { ...contact, id: contact.id || `cnt-${Date.now()}` };
      customer.contacts.push(newContact);
      this.saveCustomers(customers);
      return of({ success: true, data: newContact });
    }
    return of({ success: false, message: 'Customer not found' });
  }

  getContacts(customerId: string): Observable<any[]> {
    const customers = this.getStoredCustomers();
    const customer = customers.find(c => c.id === customerId);
    return of(customer?.contacts || []);
  }

  updateContact(customerId: string, contactId: string, contact: any): Observable<any> {
    const customers = this.getStoredCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.contacts) {
      const index = customer.contacts.findIndex((c: any) => c.id === contactId);
      if (index !== -1) {
        customer.contacts[index] = { ...customer.contacts[index], ...contact, id: contactId };
        this.saveCustomers(customers);
        return of({ success: true, data: customer.contacts[index] });
      }
    }
    return of({ success: false, message: 'Contact not found' });
  }

  deleteContact(customerId: string, contactId: string): Observable<any> {
    const customers = this.getStoredCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.contacts) {
      customer.contacts = customer.contacts.filter((c: any) => c.id !== contactId);
      this.saveCustomers(customers);
      return of({ success: true, message: 'Contact deleted successfully' });
    }
    return of({ success: false, message: 'Customer or Contact not found' });
  }
}