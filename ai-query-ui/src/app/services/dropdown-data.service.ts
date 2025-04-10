import { Injectable } from '@angular/core';
export interface DropdownItem {
  id: number;
  name: string;
}
export interface SubCategory extends DropdownItem {
  categoryID: number;
}
@Injectable({
  providedIn: 'root'
})
export class DropdownDataService {
  categories: DropdownItem[] = [
    { id: 1, name: 'Residential' },
    { id: 2, name: 'Commercial & Retail' },
    { id: 3, name: 'Industrial' },
    { id: 4, name: 'Education' },
    { id: 5, name: 'Medical' },
    { id: 6, name: 'Civil' },
    { id: 7, name: 'Social' },
    { id: 8, name: 'Agriculture' },
    { id: 9, name: 'Supply & Services' },
    { id: 10, name: 'Self Build' }
  ];
  subCategories: SubCategory[] = [
    { id: 1, name: 'Houses', categoryID: 1 },
    { id: 2, name: 'Apartments', categoryID: 1 },
    { id: 3, name: 'Mixed Development', categoryID: 1 },
    { id: 4, name: 'Retail', categoryID: 2 },
    { id: 5, name: 'Office', categoryID: 2 },
    { id: 6, name: 'Service Station', categoryID: 2 },
    { id: 7, name: 'Car Showroom', categoryID: 2 },
    { id: 8, name: 'Hotel & Guesthouse', categoryID: 2 },
    { id: 9, name: 'Bar & Restaurant', categoryID: 2 },
    { id: 11, name: 'Factory', categoryID: 3 },
    { id: 12, name: 'Warehouse', categoryID: 3 },
    { id: 10, name: 'Light Industrial', categoryID: 3 },
    { id: 14, name: 'School', categoryID: 4 },
    { id: 15, name: 'University', categoryID: 4 },
    { id: 16, name: 'Pre School', categoryID: 4 },
    { id: 17, name: 'Hospital', categoryID: 5 },
    { id: 18, name: 'Care Home', categoryID: 5 },
    { id: 19, name: 'Medical Centre', categoryID: 5 },
    { id: 21, name: 'Road & Path', categoryID: 6 },
    { id: 22, name: 'Water & Sewerage', categoryID: 6 },
    { id: 23, name: 'Transport', categoryID: 6 },
    { id: 24, name: 'Carpark', categoryID: 6 },
    { id: 25, name: 'Power Generation', categoryID: 6 },
    { id: 37, name: 'Quarry', categoryID: 6 },
    { id: 27, name: 'Sport & Leisure', categoryID: 7 },
    { id: 28, name: 'Church & Community', categoryID: 7 },
    { id: 29, name: 'Public Building', categoryID: 7 },
    { id: 31, name: 'Agricultural Building', categoryID: 8 },
    { id: 32, name: 'Professional Services', categoryID: 9 },
    { id: 33, name: 'Construction Supplies', categoryID: 9 },
    { id: 34, name: 'House', categoryID: 10 },
    { id: 35, name: 'Extension', categoryID: 10 },
    { id: 36, name: 'Alteration', categoryID: 10 }
  ];
  counties: DropdownItem[] = [
    { id: 1, name: 'Dublin' },
    { id: 2, name: 'Wicklow' },
    { id: 3, name: 'Wexford' },
    { id: 4, name: 'Carlow' },
    { id: 5, name: 'Kildare' },
    { id: 6, name: 'Meath' },
    { id: 7, name: 'Louth' },
    { id: 8, name: 'Monoghan' },
    { id: 9, name: 'Cavan' },
    { id: 10, name: 'Longford' },
    { id: 11, name: 'Longford' },
    { id: 12, name: 'Westmeath' },
    { id: 13, name: 'Offaly' },
    { id: 14, name: 'Laois' },
    { id: 15, name: 'Kilkenny' },
    { id: 16, name: 'Waterford' },
    { id: 17, name: 'Cork' },
    { id: 18, name: 'Kerry' },
    { id: 19, name: 'Limerick' },
    { id: 20, name: 'Tipperary' },
    { id: 21, name: 'Clare' },
    { id: 22, name: 'Galway' },
    { id: 23, name: 'Mayo' },
    { id: 24, name: 'Roscommon' },
    { id: 25, name: 'Sligo' },
    { id: 26, name: 'Leitrim' },
    { id: 27, name: 'Donegal' },
    { id: 28, name: 'Antrim & Newtownabbey' },
    { id: 29, name: 'Armagh Banbridge & Craigavon' }
  ];
  stages: DropdownItem[] = [
    { id: 1, name: 'Plans Applied' },
    { id: 2, name: 'Plans Withdrawn/Invalid' },
    { id: 3, name: 'Plans Refused' },
    { id: 4, name: 'Plans Granted' },
    { id: 5, name: 'Tender' },
    { id: 7, name: 'Commencement' },
    { id: 11, name: 'Pre Planning' }
  ];
  types: DropdownItem[] = [
    { id: 1, name: 'New Build' },
    { id: 2, name: 'Extension' },
    { id: 3, name: 'Alterations' }
  ];
}
