import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import axios from 'axios';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-query',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './query.component.html',
  styleUrls: ['./query.component.css']
})
export class QueryComponent implements OnInit {
  // Basic fields
  queryText: string = '';
  autoPrefixEnabled: boolean = true;
  responseText: string = '';
  commentText: string = '';
  activeQueryId: string | null = null;
  loading: boolean = false;

  // Query history
  sessionQueries: { query: string; response: string; id: string; comments?: string[] }[] = [];
  defaultMessage: string = "Welcome! Please type your query in the input box below.";
  defaultQueries: { query: string; response: string; id: string; comments?: string[] }[] = [
    {
      id: 'default1',
      query: 'How do I use this system?',
      response: 'Type your query in the box below and click "Send" to see the response.',
      comments: []
    }
  ];
  firstQuerySent: boolean = false;

  @ViewChild('commentPopup', { static: false }) commentPopup?: ElementRef;

  // =========== API Filters ===========
  showApiModal = false;
  useApi = false;

  selectedCategory: number | null = null;
  selectedSubcategory: number | null = null;
  selectedCounty: number | null = null;
  selectedStage: number | null = null;
  selectedType: number | null = null;

  apiParamSummary: string = ''; // Shown in the UI

  // Data arrays for dropdown
  categories = [
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

  subCategories = [
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
    // etc...
  ];

  counties = [
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
    { id: 29, name: 'Armagh Banbridge & Craigavon' },
    // etc...
  ];

  stages = [
    { id: 1, name: "Plans Applied" },
    { id: 2, name: "Plans Withdrawn/Invalid" },
    { id: 3, name: "Plans Refused" },
    { id: 4, name: "Plans Granted" },
    { id: 5, name: "Tender" },
    { id: 7, name: "Commencement" },
    { id: 11, name: "Pre Planning" }
    // etc...
  ];

  types = [
    { id: 1, name: 'New Build' },
    { id: 2, name: 'Extension' },
    { id: 3, name: 'Alterations' }
  ];

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit() {
    const storedQueries = sessionStorage.getItem('sessionQueries');
    if (storedQueries) {
      this.sessionQueries = JSON.parse(storedQueries);
      // If the first saved query isn't the default, we set firstQuerySent
      if (this.sessionQueries.length > 0 && this.sessionQueries[0].id !== 'default1') {
        this.firstQuerySent = true;
      }
    } else {
      // If no session queries yet, load defaults
      this.sessionQueries = this.defaultQueries;
    }
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: HTMLElement) {
    if (!this.activeQueryId) return;
    if (this.commentPopup && this.commentPopup.nativeElement.contains(target)) return;
    if (target.closest('.comment-btn')) return;
    this.activeQueryId = null;
  }

  // Called if user toggles 'Use API'
  onUseApiChanged() {
    if (!this.useApi) {
      // Turned off => clear parameters & summary
      this.selectedCategory = null;
      this.selectedSubcategory = null;
      this.selectedCounty = null;
      this.selectedStage = null;
      this.selectedType = null;
      this.apiParamSummary = '';
    }
  }

  applyFilters() {
    this.showApiModal = false;

    // Ensure numeric if needed
    if (this.selectedCategory) this.selectedCategory = Number(this.selectedCategory);
    if (this.selectedSubcategory) this.selectedSubcategory = Number(this.selectedSubcategory);
    if (this.selectedCounty) this.selectedCounty = Number(this.selectedCounty);
    if (this.selectedStage) this.selectedStage = Number(this.selectedStage);
    if (this.selectedType) this.selectedType = Number(this.selectedType);

    // Build a summary text
    this.buildApiSummary();
  }

  buildApiSummary() {
    let parts: string[] = [];

    if (this.selectedCategory) {
      const cat = this.categories.find(c => c.id === this.selectedCategory);
      if (cat) parts.push(`category=${cat.id} (${cat.name})`);
    }
    if (this.selectedSubcategory) {
      const sc = this.subCategories.find(s => s.id === this.selectedSubcategory);
      if (sc) parts.push(`subcategory=${sc.id} (${sc.name})`);
    }
    if (this.selectedCounty) {
      const co = this.counties.find(c => c.id === this.selectedCounty);
      if (co) parts.push(`county=${co.id} (${co.name})`);
    }
    if (this.selectedStage) {
      const stObj = this.stages.find(s => s.id === this.selectedStage);
      if (stObj) parts.push(`stage=${stObj.id} (${stObj.name})`);
    }
    if (this.selectedType) {
      const tObj = this.types.find(t => t.id === this.selectedType);
      if (tObj) parts.push(`type=${tObj.id} (${tObj.name})`);
    }

    if (parts.length === 0) {
      this.apiParamSummary = 'No parameters selected.';
    } else {
      this.apiParamSummary = parts.join(', ');
    }
  }

  buildApiParams(): any {
    // If user not using API, return empty
    if (!this.useApi) return {};

    // Otherwise build an object with numeric IDs
    const params: any = {};
    if (this.selectedCategory) params.category = this.selectedCategory;
    if (this.selectedSubcategory) params.subcategory = this.selectedSubcategory;
    if (this.selectedCounty) params.county = this.selectedCounty;
    if (this.selectedStage) params.stage = this.selectedStage;
    if (this.selectedType) params.type = this.selectedType;
    return params;
  }

  async sendQuery() {
    if (!this.queryText.trim()) return;

    this.loading = true;
    this.responseText = '';

    try {
      let userQuery = this.queryText.trim();

      // Prefix with "report:" if toggle is on and not already present
      if (this.autoPrefixEnabled && !userQuery.toLowerCase().startsWith('report:')) {
        userQuery = 'report: ' + userQuery;
      }

      // Clear default queries
      if (!this.firstQuerySent) {
        this.sessionQueries = [];
        this.firstQuerySent = true;
      }

      // Build API params only if checkbox is checked
      const apiParams = this.useApi ? this.buildApiParams() : {};

      // Final payload for backend
      const queryPayload = {
        search_query: userQuery,
        api_params: apiParams,
        report: userQuery.toLowerCase().startsWith('report:')
      };

      console.log("🔁 Final query payload being sent:", queryPayload);

      const response = await axios.post("http://127.0.0.1:5000/query", queryPayload);
      const formattedResponse = this.formatResponse(response.data.response);
      this.animateText(formattedResponse);
      this.queryText = '';

      // Save query and response in Firestore
      const docId = await this.firestoreService.saveQuery(userQuery, formattedResponse);
      this.sessionQueries.push({ query: userQuery, response: formattedResponse, id: docId });
      sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));

    } catch (error) {
      console.error("🔥 Error sending query:", error);
      this.responseText = '⚠️ Error fetching data.';
    } finally {
      this.loading = false;
    }
  }


  setActiveQuery(queryId: string) {
    this.activeQueryId = (this.activeQueryId === queryId) ? null : queryId;
    this.commentText = '';
  }

  async addComment() {
    if (!this.commentText || !this.activeQueryId) return;
    try {
      await this.firestoreService.addComment(this.activeQueryId, this.commentText);
      const queryIndex = this.sessionQueries.findIndex(q => q.id === this.activeQueryId);
      if (queryIndex !== -1) {
        if (!this.sessionQueries[queryIndex].comments) {
          this.sessionQueries[queryIndex].comments = [];
        }
        this.sessionQueries[queryIndex].comments!.push(this.commentText);
        sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
      }
      this.commentText = '';
    } catch (error) {
      console.error('🔥 Error adding comment:', error);
    }
  }

  formatResponse(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
      .replace(/  /g, '&nbsp;&nbsp;');
  }

  animateText(text: string) {
    this.responseText = '';
    const words = text.split(' ');
    let index = 0;
    const interval = setInterval(() => {
      if (index < words.length) {
        this.responseText += words[index] + ' ';
        index++;
      } else {
        clearInterval(interval);
      }
    }, 100);
  }
}
