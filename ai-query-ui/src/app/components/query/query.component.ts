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
  queryText: string = '';
  autoPrefixEnabled: boolean = true; // Toggle for automatic prefix
  responseText: string = '';
  commentText: string = '';
  activeQueryId: string | null = null;
  comments: string[] = [];
  loading: boolean = false;
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

  // Reference to the comment popup in the template
  @ViewChild('commentPopup', { static: false }) commentPopup?: ElementRef;

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit() {
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
  onDocumentClick(target: HTMLElement) {
    // If no popup is open, do nothing
    if (!this.activeQueryId) return;

    // If clicked inside the popup, do nothing
    if (this.commentPopup && this.commentPopup.nativeElement.contains(target)) {
      return;
    }

    // If clicked on a comment button, do nothing (the button toggles itself)
    if (target.closest('.comment-btn')) {
      return;
    }

    // Otherwise, close the popup
    this.activeQueryId = null;
  }

  async sendQuery() {
    if (!this.queryText) return;

    this.loading = true;
    this.responseText = '';

    try {
      let userQuery = this.queryText;
      // Automatically add "report:" prefix if toggle is enabled and missing
      if (this.autoPrefixEnabled && !userQuery.trim().toLowerCase().startsWith('report:')) {
        userQuery = 'report: ' + userQuery;
      }

      // Clear default queries on first real query
      if (!this.firstQuerySent) {
        this.sessionQueries = [];
        this.firstQuerySent = true;
      }

      // Send query to the backend
      const response = await axios.post("https://windows-49xt.onrender.com/query", { query: userQuery });
      const formattedResponse = this.formatResponse(response.data.response);
      this.animateText(formattedResponse);
      this.queryText = '';

      // Save query and response in Firestore
      const docId = await this.firestoreService.saveQuery(userQuery, formattedResponse);

      // Update sessionQueries and sessionStorage
      this.sessionQueries.push({ query: userQuery, response: formattedResponse, id: docId });
      sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
    } catch (error) {
      console.error("🔥 Error in sendQuery:", error);
      this.responseText = '⚠️ Error fetching data.';
    } finally {
      this.loading = false;
    }
  }

  // Toggle the active query for adding a comment
  setActiveQuery(queryId: string) {
    // If clicking the same query again, turn it off; else, set it active
    this.activeQueryId = (this.activeQueryId === queryId) ? null : queryId;
    this.commentText = '';
  }

  async addComment() {
    if (!this.commentText || !this.activeQueryId) return;

    try {
      await this.firestoreService.addComment(this.activeQueryId, this.commentText);
      // Update the sessionQueries for the active query
      const queryIndex = this.sessionQueries.findIndex(q => q.id === this.activeQueryId);
      if (queryIndex !== -1) {
        if (!this.sessionQueries[queryIndex].comments) {
          this.sessionQueries[queryIndex].comments = [];
        }
        this.sessionQueries[queryIndex].comments!.push(this.commentText);
        sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
      }
      console.log(`📌 Comment Added to Query ${this.activeQueryId}:`, this.commentText);
      this.commentText = '';
      // Optionally close popup after comment
      // this.activeQueryId = null;
    } catch (error) {
      console.error("🔥 Error adding comment:", error);
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
