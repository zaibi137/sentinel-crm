import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { CustomerService } from '../../services/customers.service';
import { UserService } from '../../services/users.service';

interface Contact {
  id?: string; // added to track existing contact for updates
  contactName: string;
  designation: string;
  mobile: string;
  whatsApp: string;
  email: string;
  birthday: string;
  isDecisionMaker: boolean;
}

interface Customer {
  id?: string;
  customerCode?: string;
  customerName: string;
  group: string;
  industry: string;
  ntn: string;
  strn: string;
  creditLimit: number;
  assignedSalespersonId: string;
  assignedSalespersonName?: string;
  billingAddress: string;
  shippingAddress: string;
  contact: Contact;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.html'
})
export class CustomersComponent implements OnInit {
  @ViewChild('custForm') custForm!: NgForm;

  customers: any[] = [];
  salesTeamRoster: any[] = [];
  searchQuery: string = '';
  isModalOpen: boolean = false;
  modalTitle: string = 'Create New Customer';
  showIncomingBanner: boolean = false;
  sameAsBilling: boolean = false;
  isSubmitting: boolean = false;

  cForm: Customer = this.getEmptyFormState();
  private editingCustomerId: string | null = null;
  private pendingOppId: string | null = null;

  constructor(
    private customerService: CustomerService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchRealUsersForSalesTeam();
    this.fetchCustomersFromAPI();

    const incomingDeal = localStorage.getItem('pending_won_opportunity');
    if (incomingDeal) {
      this.showIncomingBanner = true;
      try {
        const parsedDeal = JSON.parse(incomingDeal);
        this.pendingOppId = parsedDeal.fromOpp || null;
        this.openCreateCustomer();
        this.populateFromPipeline(parsedDeal);
      } catch (e) {}
    }
  }

  public isValidGuid(val: string): boolean {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val || '');
  }

  private fetchRealUsersForSalesTeam(): void {
    this.userService.getUsers().subscribe({
      next: (users: any[]) => {
        this.salesTeamRoster = (users || [])
          .filter(u => this.isValidGuid(u.id))
          .map(u => ({
            id: String(u.id),
            name: u.name || 'Sales Agent'
          }));
      },
      error: (err) => console.error('Failed to load real sales roster', err)
    });
  }

  getSalespersonName(id: string): string {
    const rep = this.salesTeamRoster.find(u => u.id === id);
    return rep ? rep.name : 'Unassigned';
  }

  fetchCustomersFromAPI(): void {
    this.customerService.getCustomers(1, 100, this.searchQuery).subscribe({
      next: (res: any) => {
        let itemsArray = [];
        if (res && res.data && res.data.items) {
          itemsArray = res.data.items;
        } else if (res && Array.isArray(res.items)) {
          itemsArray = res.items;
        } else if (Array.isArray(res)) {
          itemsArray = res;
        }

        this.customers = itemsArray.map((apiCust: any) => ({
          id: apiCust.id,
          customerCode: apiCust.customerCode || '',
          customerName: apiCust.customerName || apiCust.name || apiCust.companyName || '',
          group: apiCust.group || 'Corporate',
          industry: apiCust.industry || '',
          ntn: apiCust.ntn || '',
          strn: apiCust.strn || '',
          creditLimit: apiCust.creditLimit || 0,
          assignedSalespersonId: apiCust.assignedSalespersonId || '',
          assignedSalespersonName: apiCust.assignedSalespersonName || '',
          billingAddress: apiCust.billingAddress || '',
          shippingAddress: apiCust.shippingAddress || '',
          contacts: apiCust.contacts || []
        }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error("API Fetch Error", err)
    });
  }

  getFilteredCustomers(): any[] {
    if (!this.searchQuery.trim()) {
      return this.customers;
    }
    const q = this.searchQuery.toLowerCase();
    return this.customers.filter(c =>
      (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
      (c.id && c.id.toLowerCase().includes(q)) ||
      (c.customerName && c.customerName.toLowerCase().includes(q)) ||
      (c.industry && c.industry.toLowerCase().includes(q)) ||
      (c.ntn && c.ntn.toLowerCase().includes(q))
    );
  }

  openCreateCustomer(): void {
    this.modalTitle = 'Create New Customer';
    this.editingCustomerId = null;
    this.sameAsBilling = false;
    this.isSubmitting = false;
    this.cForm = this.getEmptyFormState();
    this.isModalOpen = true;
    if (this.custForm) this.custForm.resetForm(this.cForm);
  }

  openEditCustomer(customer: any): void {
    this.modalTitle = 'Modify Customer Profile';
    this.editingCustomerId = customer.id;
    this.isSubmitting = false;

    let primaryContact = this.getEmptyContactState();
    let contactId: string | undefined = undefined;

    if (customer.contacts && customer.contacts.length > 0) {
      const contact = customer.contacts[0];
      contactId = contact.id;
      primaryContact = {
        ...contact,
        birthday: contact.birthday ? contact.birthday.split('T')[0] : ''
      };
    }

    this.cForm = {
      ...customer,
      contact: {
        ...primaryContact,
        id: contactId
      }
    };

    this.sameAsBilling = (this.cForm.billingAddress === this.cForm.shippingAddress && this.cForm.billingAddress !== '');
    this.isModalOpen = true;
  }

  saveCustomer(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    if (this.sameAsBilling) {
      this.cForm.shippingAddress = this.cForm.billingAddress;
    }

    const targetAssigneeGuid = this.isValidGuid(this.cForm.assignedSalespersonId)
      ? this.cForm.assignedSalespersonId
      : null;

    let cleanBirthday = this.cForm.contact.birthday || '';
    if (cleanBirthday.includes('T')) cleanBirthday = cleanBirthday.split('T')[0];

    const contactPayload = {
      contactName: this.cForm.contact.contactName?.trim() || 'Primary Contact',
      designation: this.cForm.contact.designation || '',
      mobile: this.cForm.contact.mobile || '',
      whatsApp: this.cForm.contact.whatsApp || '',
      email: this.cForm.contact.email || '',
      birthday: cleanBirthday || null,
      isDecisionMaker: this.cForm.contact.isDecisionMaker ?? true
    };

    const handleError = (err: any) => {
      this.isSubmitting = false;
      console.error("❌ API Error:", err);
      alert('Failed to save customer. Check console for details.');
    };

    // CREATE: Embed contacts array directly to satisfy backend validation
    // CREATE: Embed contacts array matching the exact Swagger schema structure
    if (!this.editingCustomerId) {
      const customerCreatePayload = {
        customerName: this.cForm.customerName || '',
        group: this.cForm.group || 'Corporate',
        industry: this.cForm.industry || '',
        ntn: this.cForm.ntn || '',
        strn: this.cForm.strn || '',
        creditLimit: Number(this.cForm.creditLimit || 0),
        assignedSalespersonId: targetAssigneeGuid,
        billingAddress: this.cForm.billingAddress || '',
        shippingAddress: this.cForm.shippingAddress || '',
        contacts: [
          {
            contactName: this.cForm.contact.contactName?.trim() || 'Primary Contact',
            designation: this.cForm.contact.designation || '',
            mobile: this.cForm.contact.mobile || '',
            whatsApp: this.cForm.contact.whatsApp || '',
            email: this.cForm.contact.email || '',
            birthday: cleanBirthday || null,
            isDecisionMaker: this.cForm.contact.isDecisionMaker ?? true
          }
        ]
      };

      console.log("🚀 Submitting Customer to match Swagger:", customerCreatePayload);

      this.customerService.addCustomer(customerCreatePayload).subscribe({
        next: (res: any) => {
          console.log("✅ Customer created successfully:", res);
          this.finishSave();
        },
        error: handleError
      });
      return;
    }

    // UPDATE: Customer info first, then update/add contact separately if needed
    const customerUpdatePayload = {
      customerName: this.cForm.customerName || '',
      group: this.cForm.group || 'Corporate',
      industry: this.cForm.industry || '',
      ntn: this.cForm.ntn || '',
      strn: this.cForm.strn || '',
      creditLimit: Number(this.cForm.creditLimit || 0),
      assignedSalespersonId: targetAssigneeGuid,
      billingAddress: this.cForm.billingAddress || '',
      shippingAddress: this.cForm.shippingAddress || ''
    };

    this.customerService.updateCustomer(this.editingCustomerId, customerUpdatePayload).subscribe({
      next: () => {
        console.log("✅ Customer updated.");
        const existingContactId = this.cForm.contact.id || null;
        this.createOrUpdateContact(this.editingCustomerId!, existingContactId, contactPayload, () => this.finishSave(), handleError);
      },
      error: handleError
    });
  }

  // Helper: create or update a contact during update mode
  private createOrUpdateContact(
    customerId: string,
    contactId: string | null,
    contactPayload: any,
    onSuccess: () => void,
    onError: (err: any) => void
  ): void {
    if (!contactPayload.contactName?.trim()) {
      onSuccess();
      return;
    }

    if (contactId) {
      this.customerService.updateContact(customerId, contactId, contactPayload).subscribe({
        next: () => { console.log("✅ Contact updated."); onSuccess(); },
        error: onError
      });
    } else {
      this.customerService.addContact(customerId, contactPayload).subscribe({
        next: () => { console.log("✅ Contact added."); onSuccess(); },
        error: onError
      });
    }
  }

  // Helper: finish the save process
  private finishSave(): void {
    this.isSubmitting = false;
    this.isModalOpen = false;
    this.fetchCustomersFromAPI();

    if (this.showIncomingBanner) {
      if (this.pendingOppId) {
        try {
          const storedOpps = localStorage.getItem('opportunities_pipeline');
          if (storedOpps) {
            const opps = JSON.parse(storedOpps);
            const updatedOpps = opps.filter((o: any) => o.id !== this.pendingOppId);
            localStorage.setItem('opportunities_pipeline', JSON.stringify(updatedOpps));
          }
        } catch (e) {}
      }
      localStorage.removeItem('pending_won_opportunity');
      this.showIncomingBanner = false;
    }
  }

  deleteCustomer(id: string): void {
    if (confirm('Are you absolutely sure you want to delete this customer record permanently?')) {
      if (this.isValidGuid(id)) {
        this.customerService.deleteCustomer(id).subscribe({
          next: () => this.fetchCustomersFromAPI(),
          error: (err) => console.error("Delete Error", err)
        });
      }
    }
  }

  onSameAsBillingToggle(): void {
    if (this.sameAsBilling) this.cForm.shippingAddress = this.cForm.billingAddress;
  }

  onBillingAddressChange(): void {
    if (this.sameAsBilling) this.cForm.shippingAddress = this.cForm.billingAddress;
  }

  private populateFromPipeline(deal: any): void {
    this.cForm.customerName = deal.name || '';
    this.cForm.industry = deal.industry || 'General';
    this.cForm.creditLimit = deal.budget || 0;
    if (deal.assignee && this.isValidGuid(deal.assignee)) {
      this.cForm.assignedSalespersonId = deal.assignee;
    }
    if (deal.contactPerson) {
      this.cForm.contact.contactName = deal.contactPerson;
    }
  }

  private getEmptyFormState(): Customer {
    return {
      id: '',
      customerCode: '',
      customerName: '',
      group: 'Corporate',
      industry: 'General',
      ntn: '',
      strn: '',
      assignedSalespersonId: '',
      billingAddress: '',
      shippingAddress: '',
      creditLimit: 0,
      contact: this.getEmptyContactState()
    };
  }

  private getEmptyContactState(): Contact {
    return {
      contactName: '',
      designation: '',
      mobile: '',
      whatsApp: '',
      email: '',
      birthday: '',
      isDecisionMaker: true
    };
  }
}