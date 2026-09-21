import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Opportunities } from './opportunities';

describe('Opportunities', () => {
  let component: Opportunities;
  let fixture: ComponentFixture<Opportunities>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Opportunities],
    }).compileComponents();

    fixture = TestBed.createComponent(Opportunities);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
