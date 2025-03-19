import { Component, OnInit } from '@angular/core';
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
})export class QueryComponent implements OnInit {
  queryText: string = '';
  responseText: string = '';
  commentText: string = '';
  // Remove queryId used for comments; use activeQueryId for the selected query
  activeQueryId: string | null = null;
  comments: string[] = [];
  loading: boolean = false;
  // Remove global showCommentBox; we'll use activeQueryId to conditionally show the comment section
  sessionQueries: { query: string; response: string; id: string; comments?: string[] }[] = [];

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit() {
    const storedQueries = sessionStorage.getItem('sessionQueries');
    if (storedQueries) {
      this.sessionQueries = JSON.parse(storedQueries);
    }
  }

  async sendQuery() {
    if (!this.queryText) return;

    this.loading = true;
    this.responseText = '';

    try {
      const userQuery = this.queryText;
      const response = await axios.post("https://windows-49xt.onrender.com/query", { query: userQuery });
      const formattedResponse = this.formatResponse(response.data.response);
      this.animateText(formattedResponse);
      this.queryText = '';

      // Save query in Firestore
      const docId = await this.firestoreService.saveQuery(userQuery, formattedResponse);
      // Reset local comments for new query
      this.comments = [];

      // Add the new query to session storage
      this.sessionQueries.push({ query: userQuery, response: formattedResponse, id: docId });
      sessionStorage.setItem('sessionQueries', JSON.stringify(this.sessionQueries));
    } catch (error) {
      console.error("🔥 Error in sendQuery:", error);
      this.responseText = '⚠️ Error fetching data.';
    } finally {
      this.loading = false;
    }
  }

  // Sets the active query for commenting. Toggle off if already selected.
  setActiveQuery(queryId: string) {
    this.activeQueryId = this.activeQueryId === queryId ? null : queryId;
    // Optionally clear previous comment input when switching queries.
    this.commentText = '';
  }

  async addComment() {
    if (!this.commentText || !this.activeQueryId) return;

    try {
      await this.firestoreService.addComment(this.activeQueryId, this.commentText);
      // Update the session query that matches the active query
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
      // Optionally close the comment section after adding a comment:
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
