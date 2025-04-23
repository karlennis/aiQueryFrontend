// src/app/components/query/query.component.ts
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
  sessionQueries: any[] = [];

  isReportResponse = false;
  reportHtml = '';
  reportData: any[] = [];
  matchCount = 0;
  showReport = false;

  @ViewChild('commentPopup', { static: false }) commentPopup?: ElementRef;
  @ViewChild('reportPanel', { static: false }) reportPanel?: ElementRef;

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
    this.sessionQueries = stored
      ? JSON.parse(stored)
      : [{ id: 'default1', query: 'How do I use this system?', response: 'Type your query and click Send.', comments: [] }];
    const savedHtml = localStorage.getItem('reportHtml');
    if (savedHtml) {
      this.reportHtml = savedHtml;
      this.isReportResponse = true;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const tgt = event.target as HTMLElement;
    if (this.activeQueryId &&
        !this.commentPopup?.nativeElement.contains(tgt) &&
        !tgt.closest('.comment-btn')) {
      this.activeQueryId = null;
    }
    if (this.showReport && !this.reportPanel?.nativeElement.contains(tgt)) {
      this.closeReport();
    }
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
    this.buildApiSummary();
  }

  buildApiSummary(): void {
    const parts: string[] = [];
    if (this.selectedCategory) {
      const c = this.categories.find(x => x.id === this.selectedCategory)!;
      parts.push(`category=${c.id} (${c.name})`);
    }
    if (this.selectedSubcategory) {
      const s = this.subCategories.find(x => x.id === this.selectedSubcategory)!;
      parts.push(`subcategory=${s.id} (${s.name})`);
    }
    if (this.selectedCounty) {
      const c = this.counties.find(x => x.id === this.selectedCounty)!;
      parts.push(`county=${c.id} (${c.name})`);
    }
    if (this.selectedStage) {
      const s = this.stages.find(x => x.id === this.selectedStage)!;
      parts.push(`stage=${s.id} (${s.name})`);
    }
    if (this.selectedType) {
      const t = this.types.find(x => x.id === this.selectedType)!;
      parts.push(`type=${t.id} (${t.name})`);
    }
    this.apiParamSummary = parts.length ? parts.join(', ') : 'No parameters selected.';
  }

  buildApiParams(): any {
    if (!this.useApi) return {};
    const p: any = {};
    if (this.selectedCategory) p.category = this.selectedCategory;
    if (this.selectedSubcategory) p.subcategory = this.selectedSubcategory;
    if (this.selectedCounty) p.county = this.selectedCounty;
    if (this.selectedStage) p.stage = this.selectedStage;
    if (this.selectedType) p.type = this.selectedType;
    return p;
  }

  async sendQuery(): Promise<void> {
    if (!this.queryText.trim()) return;
    this.loading = true;
    this.errorText = '';
    try {
      let q = this.queryText.trim();
      if (this.autoPrefixEnabled && !q.toLowerCase().startsWith('report:')) {
        q = 'report: ' + q;
      }
      const res = await axios.post('http://127.0.0.1:5000/query', {
        search_query: q,
        api_params: this.useApi ? this.buildApiParams() : {},
        report: q.toLowerCase().startsWith('report:')
      });
      if (res.data.is_report) {
        this.matchCount = res.data.match_count;
        this.reportData = res.data.projects;
        this.reportHtml = this.buildReportHtml(this.reportData, this.matchCount);
        this.isReportResponse = true;
        localStorage.setItem('reportHtml', this.reportHtml);
      } else {
        this.responseText = this.formatResponse(res.data.response);
      }
      const docId = await this.firestoreService.saveQuery(q, this.responseText || this.reportHtml);
      this.sessionQueries.push({
        query: q,
        response: this.responseText || this.reportHtml,
        id: docId,
        comments: []
      });
      sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
      this.queryText = '';
    } catch {
      this.errorText = 'Error fetching data.';
    } finally {
      this.loading = false;
    }
  }

  viewReport(evt: MouseEvent): void {
    evt.stopPropagation();
    this.showReport = true;
  }

  closeReport(evt?: MouseEvent): void {
    evt?.stopPropagation();
    this.showReport = false;
  }

  downloadReport(): void {
    const c = document.createElement('div');
    c.innerHTML = this.reportHtml;
    c.style.position = 'absolute';
    c.style.left = '0';
    c.style.top = '0';
    c.style.width = '1500px';
    document.body.appendChild(c);

    const pdf = new jsPDF('p', 'pt', 'a4');
    pdf.html(c, {
      callback: doc => {
        doc.save('planning_report.pdf');
        document.body.removeChild(c);
      },
      x: 10, y: 10,
      margin: [10,10,10,10],
      windowWidth: 1500,
      html2canvas: { scale: 0.34 },
      autoPaging: 'text'
    });
  }

  buildReportHtml(data: any[], count: number): string {
    const style = `
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin:0; padding:0; font-family:Arial,sans-serif; background:#fff; color:#000; }
        body { padding:15px; max-width:650px; margin:auto; }
        h1 { font-size:16pt; margin-bottom:12px; }
        .summary p { margin:8px 0; line-height:1.8; font-size:9pt; }
        h2 { font-size:12pt; margin-top:24px; margin-bottom:6px; border-bottom:1px solid #ccc; padding-bottom:3px; }
        .project { margin-bottom:30px; page-break-inside:avoid; }
        .project p { margin:6px 0; line-height:1.8; font-size:9pt; }
        .project strong { display:inline-block; min-width:120px; }
        .mentions { background:#f5f5f5; padding:8px; border-left:4px solid #007bff; margin:8px 0; line-height:1.8; font-size:9pt; white-space:pre-wrap; }
        a { color:#007bff; word-break:break-word; font-size:9pt; }
      </style>
    `;
    const md = (t: string = '') => t
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\r?\n/g, '<br>')
      .replace(/^- /gm, '• ');
    const projectsHtml = data.map(p => `
      <div class="project">
        <h2>${p.project_id || 'N/A'}: ${p.planning_title || 'N/A'}</h2>
        <p><strong>Last Researched:</strong> ${p.planning_public_updated || 'N/A'}</p>
        <p><strong>Stage:</strong> ${p.planning_stage || 'N/A'}</p>
        <p><strong>Link:</strong> ${p.planning_urlopen
          ? `<a href="${p.planning_urlopen}" target="_blank">${p.planning_urlopen}</a>`
          : 'N/A'}</p>
        <p><strong>Applicant Details:</strong></p>
        <div class="mentions">${md(p.applicant_details)}</div>
        <p><strong>Feature Mentions:</strong></p>
        <div class="mentions">${md(p.feature_mentions)}</div>
      </div>
    `).join('');
    return `
      ${style}
      <body>
        <h1>Planning Application Report</h1>
        <div class="summary">
          <p><strong>Number of Projects:</strong> ${data.length}</p>
          <p><strong>Documents Matched:</strong> ${count}</p>
        </div>
        ${projectsHtml}
      </body>
    `;
  }

  formatResponse(txt?: string): string {
    return txt?.replace(/\n/g,'<br>').replace(/\t/g,'&nbsp;&nbsp;&nbsp;&nbsp;') || '';
  }

  animateText(text: string): void {
    this.responseText = '';
    const words = text.split(' ');
    let i = 0;
    const iv = setInterval(() => {
      if (i < words.length) {
        this.responseText += words[i++] + ' ';
      } else {
        clearInterval(iv);
      }
    }, 50);
  }

  setActiveQuery(id: string): void {
    this.activeQueryId = this.activeQueryId === id ? null : id;
    this.commentText = '';
  }

  async addComment(): Promise<void> {
    if (!this.commentText || !this.activeQueryId) return;
    await this.firestoreService.addComment(this.activeQueryId, this.commentText);
    const idx = this.sessionQueries.findIndex(q => q.id === this.activeQueryId);
    if (idx > -1) {
      const it = this.sessionQueries[idx];
      it.comments = it.comments || [];
      it.comments.push(this.commentText);
      sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
    }
    this.commentText = '';
  }
}
