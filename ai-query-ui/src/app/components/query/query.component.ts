import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import axios from 'axios';
import { FirestoreService } from '../../services/firestore.service';
import { DropdownDataService, DropdownItem, SubCategory } from '../../services/dropdown-data.service';

@Component({
  selector: 'app-query',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './query.component.html',
  styleUrls: ['./query.component.css']
})
export class QueryComponent implements OnInit {
  queryText: string = '';
  autoPrefixEnabled: boolean = true;
  responseText: string = '';
  commentText: string = '';
  activeQueryId: string | null = null;
  loading: boolean = false;
  sessionQueries: { query: string; response: string; id: string; comments?: string[] }[] = [];
  defaultMessage: string = "Welcome! Please type your query in the input box below.";
  defaultQueries: { query: string; response: string; id: string; comments?: string[] }[] = [
    { id: 'default1', query: 'How do I use this system?', response: 'Type your query in the box below and click "Send" to see the response.', comments: [] }
  ];
  firstQuerySent: boolean = false;
  @ViewChild('commentPopup', { static: false }) commentPopup?: ElementRef;
  showApiModal = false;
  useApi = false;
  selectedCategory: number | null = null;
  selectedSubcategory: number | null = null;
  selectedCounty: number | null = null;
  selectedStage: number | null = null;
  selectedType: number | null = null;
  apiParamSummary: string = '';

  constructor(
    private firestoreService: FirestoreService,
    public dropdownDataService: DropdownDataService
  ) {}

  // Expose service arrays so they are available in the template.
  get categories(): DropdownItem[] {
    return this.dropdownDataService.categories;
  }
  get subCategories(): SubCategory[] {
    return this.dropdownDataService.subCategories;
  }
  get counties(): DropdownItem[] {
    return this.dropdownDataService.counties;
  }
  get stages(): DropdownItem[] {
    return this.dropdownDataService.stages;
  }
  get types(): DropdownItem[] {
    return this.dropdownDataService.types;
  }

  ngOnInit(): void {
    const storedQueries = sessionStorage.getItem('sessionQueries');
    if (storedQueries) {
      this.sessionQueries = JSON.parse(storedQueries);
      if (this.sessionQueries.length > 0 && this.sessionQueries[0].id !== 'default1') {
        this.firstQuerySent = true;
      }
    } else {
      this.sessionQueries = this.defaultQueries;
    }
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: HTMLElement): void {
    if (!this.activeQueryId) return;
    if (this.commentPopup && this.commentPopup.nativeElement.contains(target)) return;
    if (target.closest('.comment-btn')) return;
    this.activeQueryId = null;
  }

  onUseApiChanged(): void {
    if (!this.useApi) {
      this.selectedCategory = null;
      this.selectedSubcategory = null;
      this.selectedCounty = null;
      this.selectedStage = null;
      this.selectedType = null;
      this.apiParamSummary = '';
    }
  }

  applyFilters(): void {
    this.showApiModal = false;
    if (this.selectedCategory) this.selectedCategory = Number(this.selectedCategory);
    if (this.selectedSubcategory) this.selectedSubcategory = Number(this.selectedSubcategory);
    if (this.selectedCounty) this.selectedCounty = Number(this.selectedCounty);
    if (this.selectedStage) this.selectedStage = Number(this.selectedStage);
    if (this.selectedType) this.selectedType = Number(this.selectedType);
    this.buildApiSummary();
  }

  buildApiSummary(): void {
    const parts: string[] = [];
    if (this.selectedCategory) {
      const cat = this.categories.find((c: DropdownItem) => c.id === this.selectedCategory);
      if (cat) parts.push(`category=${cat.id} (${cat.name})`);
    }
    if (this.selectedSubcategory) {
      const sc = this.subCategories.find((s: SubCategory) => s.id === this.selectedSubcategory);
      if (sc) parts.push(`subcategory=${sc.id} (${sc.name})`);
    }
    if (this.selectedCounty) {
      const co = this.counties.find((c: DropdownItem) => c.id === this.selectedCounty);
      if (co) parts.push(`county=${co.id} (${co.name})`);
    }
    if (this.selectedStage) {
      const stObj = this.stages.find((s: DropdownItem) => s.id === this.selectedStage);
      if (stObj) parts.push(`stage=${stObj.id} (${stObj.name})`);
    }
    if (this.selectedType) {
      const tObj = this.types.find((t: DropdownItem) => t.id === this.selectedType);
      if (tObj) parts.push(`type=${tObj.id} (${tObj.name})`);
    }
    this.apiParamSummary = parts.length === 0 ? 'No parameters selected.' : parts.join(', ');
  }

  buildApiParams(): any {
    if (!this.useApi) return {};
    const params: any = {};
    if (this.selectedCategory) params.category = this.selectedCategory;
    if (this.selectedSubcategory) params.subcategory = this.selectedSubcategory;
    if (this.selectedCounty) params.county = this.selectedCounty;
    if (this.selectedStage) params.stage = this.selectedStage;
    if (this.selectedType) params.type = this.selectedType;
    return params;
  }

  async sendQuery(): Promise<void> {
    if (!this.queryText.trim()) return;
    this.loading = true;
    this.responseText = '';
    try {
      let userQuery: string = this.queryText.trim();
      if (this.autoPrefixEnabled && !userQuery.toLowerCase().startsWith('report:')) {
        userQuery = 'report: ' + userQuery;
      }
      if (!this.firstQuerySent) {
        this.sessionQueries = [];
        this.firstQuerySent = true;
      }
      const apiParams = this.useApi ? this.buildApiParams() : {};
      const queryPayload = {
        search_query: userQuery,
        api_params: apiParams,
        report: userQuery.toLowerCase().startsWith('report:')
      };
      const response = await axios.post("https://windows-49xt.onrender.com/query", queryPayload);
      const formattedResponse = this.formatResponse(response.data.response);
      this.animateText(formattedResponse);
      this.queryText = '';
      const docId = await this.firestoreService.saveQuery(userQuery, formattedResponse);
      this.sessionQueries.push({ query: userQuery, response: formattedResponse, id: docId });
      sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
    } catch (error) {
      console.error(error);
      this.responseText = '⚠️ Error fetching data.';
    } finally {
      this.loading = false;
    }
  }

  setActiveQuery(queryId: string): void {
    this.activeQueryId = this.activeQueryId === queryId ? null : queryId;
    this.commentText = '';
  }

  async addComment(): Promise<void> {
    if (!this.commentText || !this.activeQueryId) return;
    try {
      await this.firestoreService.addComment(this.activeQueryId, this.commentText);
      const queryIndex = this.sessionQueries.findIndex(q => q.id === this.activeQueryId);
      if (queryIndex !== -1) {
        const queryItem = this.sessionQueries[queryIndex];
        if (!queryItem.comments) {
          queryItem.comments = [];
        }
        queryItem.comments.push(this.commentText);
        sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
      }
      this.commentText = '';
    } catch (error) {
      console.error(error);
    }
  }

  formatResponse(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
      .replace(/  /g, '&nbsp;&nbsp;');
  }

  animateText(text: string): void {
    this.responseText = '';
    const words: string[] = text.split(' ');
    let index: number = 0;
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
