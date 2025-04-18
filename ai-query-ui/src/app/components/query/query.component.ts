import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import axios from 'axios';
import { jsPDF } from 'jspdf';
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
  queryText = '';
  autoPrefixEnabled = true;
  responseText = '';
  errorText = '';
  commentText = '';
  activeQueryId: string | null = null;
  loading = false;
  sessionQueries: { query: string; response: string; id: string; comments?: string[] }[] = [];
  defaultMessage = "Welcome! Please type your query in the input box below.";
  defaultQueries = [
    { id: 'default1', query: 'How do I use this system?', response: 'Type your query in the box below and click "Send" to see the response.', comments: [] }
  ];
  firstQuerySent = false;
  isReportResponse = false;
  reportHtml = '';
  reportData: any[] = [];
  matchCount = 0;
  @ViewChild('commentPopup', { static: false }) commentPopup?: ElementRef;
  showApiModal = false;
  useApi = false;
  selectedCategory: number | null = null;
  selectedSubcategory: number | null = null;
  selectedCounty: number | null = null;
  selectedStage: number | null = null;
  selectedType: number | null = null;
  apiParamSummary = '';

  constructor(
    private firestoreService: FirestoreService,
    public dropdownDataService: DropdownDataService
  ) {}

  get categories(): DropdownItem[] { return this.dropdownDataService.categories; }
  get subCategories(): SubCategory[] { return this.dropdownDataService.subCategories; }
  get counties(): DropdownItem[] { return this.dropdownDataService.counties; }
  get stages(): DropdownItem[] { return this.dropdownDataService.stages; }
  get types(): DropdownItem[] { return this.dropdownDataService.types; }

  ngOnInit(): void {
    const stored = sessionStorage.getItem('sessionQueries');
    if (stored) {
      this.sessionQueries = JSON.parse(stored);
      if (this.sessionQueries.length && this.sessionQueries[0].id !== 'default1') this.firstQuerySent = true;
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
      const st = this.stages.find(s => s.id === this.selectedStage);
      if (st) parts.push(`stage=${st.id} (${st.name})`);
    }
    if (this.selectedType) {
      const t = this.types.find(x => x.id === this.selectedType);
      if (t) parts.push(`type=${t.id} (${t.name})`);
    }
    this.apiParamSummary = parts.length ? parts.join(', ') : 'No parameters selected.';
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
    this.errorText = '';
    this.isReportResponse = false;
    this.reportHtml = '';
    this.reportData = [];
    this.matchCount = 0;
    try {
      let query = this.queryText.trim();
      if (this.autoPrefixEnabled && !query.toLowerCase().startsWith('report:')) {
        query = 'report: ' + query;
      }
      if (!this.firstQuerySent) { this.sessionQueries = []; this.firstQuerySent = true; }
      const apiParams = this.useApi ? this.buildApiParams() : {};
      const payload = { search_query: query, api_params: apiParams, report: query.toLowerCase().startsWith('report:') };
      const res = await axios.post("http://127.0.0.1:5000/query", payload);
      if (res.data.error) { this.errorText = res.data.error; this.loading = false; return; }
      if (res.data.is_report) {
        this.matchCount = res.data.match_count ?? 0;
        this.reportData = res.data.projects || [];
        this.reportHtml = this.buildReportHtml(this.reportData, this.matchCount);
        this.responseText = this.reportHtml;
        this.isReportResponse = true;
      } else {
        const rawResp = this.formatResponse(res.data.response);
        this.animateText(rawResp);
      }
      this.queryText = '';
      const savedResponse = this.responseText;
      const docId = await this.firestoreService.saveQuery(query, savedResponse);
      this.sessionQueries.push({ query: query, response: savedResponse, id: docId });
      sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
    } catch (e) {
      this.errorText = "Error fetching data.";
    } finally {
      this.loading = false;
    }
  }

  buildReportHtml(data: any[], count: number): string {
    const projHtml = data.map(p => `
      <div class="project">
        <h2>Project ${p.project_id}: ${p.planning_title}</h2>
        <p><strong>Last researched:</strong> ${p.planning_public_updated}</p>
        <p><strong>Stage:</strong> ${p.planning_stage}</p>
        <p><strong>Project Link:</strong> ${p.planning_urlopen}</p>
        <p><strong>Applicant Details:</strong><br>${(p.applicant_details || "").replace(/\n/g, '<br>')}</p>
        <p><strong>Feature Mentions:</strong><br>${(p.feature_mentions || "").replace(/\n/g, '<br>')}</p>
      </div>
    `).join('');
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>Planning Application Report</h1>
        <h2>Technical Summary</h2>
        <ul>
          <li><strong>Number of Projects:</strong> ${data.length}</li>
          <li><strong>Number of Documents Matched:</strong> ${count}</li>
        </ul>
        ${projHtml}
      </div>
    `;
  }

  downloadReport(): void {
    if (!this.reportHtml) { alert("No report content found."); return; }
    const temp = document.createElement("div");
    temp.innerHTML = this.reportHtml;
    temp.style.position = "absolute";
    temp.style.left = "0";
    temp.style.top = "0";
    temp.style.width = "800px";
    temp.style.backgroundColor = "white";
    document.body.appendChild(temp);
    const pdf = new jsPDF('p', 'pt', 'a4');
    pdf.html(temp, {
      callback: (doc: jsPDF) => { doc.save("planning_report.pdf"); document.body.removeChild(temp); },
      x: 10, y: 10, margin: [20, 20, 20, 20],
      autoPaging: 'text'
    });
  }

  setActiveQuery(id: string): void {
    this.activeQueryId = this.activeQueryId === id ? null : id;
    this.commentText = '';
  }

  async addComment(): Promise<void> {
    if (!this.commentText || !this.activeQueryId) return;
    try {
      await this.firestoreService.addComment(this.activeQueryId, this.commentText);
      const idx = this.sessionQueries.findIndex(q => q.id === this.activeQueryId);
      if (idx !== -1) {
        const item = this.sessionQueries[idx];
        if (!item.comments) item.comments = [];
        item.comments.push(this.commentText);
        sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
      }
      this.commentText = '';
    } catch {}
  }

  formatResponse(txt: string | undefined): string {
    if (!txt) return '';
    return txt.replace(/\n/g, '<br>')
              .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
              .replace(/  /g, '&nbsp;&nbsp;');
  }

  animateText(text: string): void {
    this.responseText = '';
    const words = text.split(' ');
    let i = 0;
    const interval = setInterval(() => {
      if (i < words.length) {
        this.responseText += words[i] + ' ';
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);
  }
}
