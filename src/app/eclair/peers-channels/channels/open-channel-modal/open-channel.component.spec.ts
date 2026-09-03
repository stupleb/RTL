import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { EffectsModule } from '@ngrx/effects';
import { Store, StoreModule } from '@ngrx/store';
import { SharedModule } from '../../../../shared/shared.module';

import { DataService } from '../../../../shared/services/data.service';
import { ECLActions } from '../../../../shared/services/consts-enums-functions';
import { RootReducer } from '../../../../store/rtl.reducers';
import { LNDReducer } from '../../../../lnd/store/lnd.reducers';
import { CLNReducer } from '../../../../cln/store/cln.reducers';
import { ECLReducer } from '../../../../eclair/store/ecl.reducers';
import { mockCLEffects, mockDataService, mockECLEffects, mockLNDEffects, mockMatDialogRef, mockRTLEffects } from '../../../../shared/test-helpers/mock-services';
import { ECLOpenChannelComponent } from './open-channel.component';

describe('ECLOpenChannelComponent', () => {
  let component: ECLOpenChannelComponent;
  let fixture: ComponentFixture<ECLOpenChannelComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ECLOpenChannelComponent],
      imports: [
        BrowserAnimationsModule,
        SharedModule,
        StoreModule.forRoot({ root: RootReducer, lnd: LNDReducer, cln: CLNReducer, ecl: ECLReducer }),
        EffectsModule.forRoot([mockRTLEffects, mockLNDEffects, mockCLEffects, mockECLEffects])
      ],
      providers: [
        { provide: DataService, useClass: mockDataService },
        { provide: MatDialogRef, useClass: mockMatDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { message: {} } }
      ]
    }).
      compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ECLOpenChannelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Eclair refuses an open whose funding fee exceeds fundingFeeBudgetSatoshis, and falls back to 0.1% of
  // the amount when none is sent, which no funding transaction fits under for a small channel. The dialog
  // therefore always sends one: the typed value, or 1% of the amount with a 2,000 sat floor.
  const dispatchedNewChannel = (dispatchSpy: jasmine.Spy) => dispatchSpy.calls.allArgs().map((args) => args[0]).find((action) => action.type === ECLActions.SAVE_NEW_CHANNEL_ECL);

  it('should derive the default fee budget from the amount, with a floor', () => {
    component.fundingAmount = 25000;
    expect(component.defaultFeeBudget()).toBe(2000);
    component.fundingAmount = 250000;
    expect(component.defaultFeeBudget()).toBe(2500);
    component.fundingAmount = 1000000;
    expect(component.defaultFeeBudget()).toBe(10000);
  });

  it('should send the default fee budget when none is typed', () => {
    const dispatchSpy = spyOn(TestBed.inject(Store), 'dispatch').and.callThrough();
    component.selectedPubkey = 'peer-pubkey';
    component.fundingAmount = 25000;
    component.feeBudget = null;

    component.onOpenChannel();

    const dispatched = dispatchedNewChannel(dispatchSpy);
    expect(dispatched).toBeDefined();
    expect(dispatched.payload.nodeId).toEqual('peer-pubkey');
    expect(dispatched.payload.amount).toEqual(25000);
    expect(dispatched.payload.feeBudget).toEqual(2000);
  });

  it('should send the typed fee budget', () => {
    const dispatchSpy = spyOn(TestBed.inject(Store), 'dispatch').and.callThrough();
    component.selectedPubkey = 'peer-pubkey';
    component.fundingAmount = 25000;
    component.feeBudget = 500;

    component.onOpenChannel();

    expect(dispatchedNewChannel(dispatchSpy).payload.feeBudget).toEqual(500);
  });

  it('should refuse a fee budget below one sat', () => {
    const dispatchSpy = spyOn(TestBed.inject(Store), 'dispatch').and.callThrough();
    component.selectedPubkey = 'peer-pubkey';
    component.fundingAmount = 25000;
    component.feeBudget = 0;

    expect(component.onOpenChannel()).toBe(true);
    expect(dispatchedNewChannel(dispatchSpy)).toBeUndefined();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });
});
