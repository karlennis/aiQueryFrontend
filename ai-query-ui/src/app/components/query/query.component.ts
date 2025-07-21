// src/app/components/query/query.component.ts
import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { FirestoreService } from '../../services/firestore.service';
import { DropdownDataService, DropdownItem, SubCategory } from '../../services/dropdown-data.service';
import { DomSanitizer } from '@angular/platform-browser';
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
    public dropdownDataService: DropdownDataService,
    private sanitizer: DomSanitizer
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
    if (
      this.activeQueryId &&
      !this.commentPopup?.nativeElement.contains(tgt) &&
      !tgt.closest('.comment-btn')
    ) {
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
      const res = await axios.post('https://windows-49xt.onrender.com/query', {
        search_query: q,
        api_params: this.useApi ? this.buildApiParams() : {},
        report: q.toLowerCase().startsWith('report:')
      });

      if (res.data.is_report) {
        this.matchCount = res.data.match_count;
        const raw = res.data.projects as any[];

        // ** Only drop projects where feature_mentions literally starts with "No mentions found" **
        const filtered = raw.filter(p => {
          const fm = (p.feature_mentions || '').toString().trim().toLowerCase();
          return !fm.startsWith('no mentions found');
        });

        this.reportData = filtered;
        this.reportHtml = this.buildReportHtml(filtered, this.matchCount, this.queryText.trim());
        this.isReportResponse = true;
        localStorage.setItem('reportHtml', this.reportHtml);

      } else {
        this.responseText = this.formatResponse(res.data.response);
      }

      const docId = await this.firestoreService.saveQuery(
        q,
        this.responseText || this.reportHtml
      );
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
    const tmp = document.createElement('div');
    tmp.innerHTML = this.reportHtml;
    tmp.style.position = 'absolute';
    tmp.style.left = '0';
    tmp.style.top  = '0';
    tmp.style.width = '1600px';
    document.body.appendChild(tmp);

    const pdf = new jsPDF('p', 'pt', 'a4');
    pdf.html(tmp, {
      callback: doc => {
        doc.save('planning_report.pdf');
        document.body.removeChild(tmp);
      },
      x: 10, y: 10,
      margin: [10, 10, 10, 10],
      windowWidth: 1600,
      /* ↓↓↓  the critical flag so html2canvas keeps our hard <br> breaks  ↓↓↓ */
      html2canvas: { scale: 0.35, letterRendering: true },
      autoPaging: 'text'
    });
  }
/* 100 % single-column – every label on its own line, followed by the value */
buildReportHtml(data: any[], count: number, query: string): string {

  const style = `
    <style>
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;
           max-width:960px;margin:auto;padding:36px 32px}

      /* header */
      h1{font-size:24pt;margin-bottom:22px}
      .summary p{font-size:13pt;line-height:1.7;margin:4px 0}

      /* project card */
      .project{background:#f1f6ff;border-left:4px solid #0d6efd;
               padding:22px 24px;margin:34px 0;page-break-inside:avoid}
      .project h2{font-size:17pt;line-height:1.3;margin-bottom:8px}
      .project a{font-size:13pt;color:#0d6efd;display:block;
                 overflow-wrap:anywhere;margin-bottom:4px}

      .label{font-weight:600;display:block;margin:8px 0 2px}

      .feature{margin-top:16px;background:#eaf2ff;padding:16px 18px;
               border-left:4px solid #0d6efd}
      .feature ul{margin:6px 0 0;padding-left:22px;
                  font-size:13pt;line-height:1.65;white-space:pre-wrap}
      .feature li{margin-bottom:3px;text-indent:-6px}
      .feature p{font-size:13pt;line-height:1.65;margin:8px 0 0}

      @media print{body{padding:20pt}}
    </style>
  `;

  /* helper to keep bold inside snippets */
  const md = (txt = '') =>
        txt.replace(/\*\*(.*?)\*\*/g, '<span class="label">$1</span>')
           .replace(/\r?\n/g, '<br>');

  /* build every project card */
  const projectsHtml = data.map(p => `
      <div class="project">
        <h2>${p.project_id}: ${p.planning_title || 'N/A'}</h2>

        ${p.bii_url ? `
          <span class="label">BII URL:</span><br>
          <a href="${p.bii_url}" target="_blank">${p.bii_url}</a><br>
        ` : ''}

        ${p.planning_urlopen ? `
          <span class="label">Planning URL:</span><br>
          <a href="${p.planning_urlopen}" target="_blank">${p.planning_urlopen}</a><br>
        ` : ''}

        <span class="label">Updated On:</span><br>${p.updated_on || 'N/A'}<br>
        <span class="label">Stage:</span><br>${p.planning_stage || 'N/A'}<br>
        <span class="label">Type:</span><br>${p.planning_category || 'N/A'}

        <div class="feature">
          <p class="label">Feature Mentions:</p>
          <ul>${md(p.feature_mentions)
                .replace(/•\s*/g, '<li>')
                .replace(/\n/g, '</li>')}</ul>
        </div>
      </div>
  `).join('');

  return `
    ${style}
    <body>
      <h1>Planning Application Report</h1>
      <div class="summary">
        <p><span class="label">Query:</span> ${query}</p>
        <p><span class="label">Number of Projects:</span> ${data.length}</p>
        <p><span class="label">Documents Matched:</span> ${count}</p>
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
  get trustedReportHtml() {
  return this.sanitizer.bypassSecurityTrustHtml(this.reportHtml);
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
