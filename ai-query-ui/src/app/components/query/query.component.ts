import { Component } from '@angular/core';
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
export class QueryComponent {
  queryText: string = '';
  responseText: string = '';
  commentText: string = '';
  queryId: string | null = null;
  comments: string[] = [];
  loading: boolean = false;
  showCommentBox: boolean = false; // ✅ Controls comment box visibility

  constructor(private firestoreService: FirestoreService) {}

  async sendQuery() {
    if (!this.queryText) return;

    this.loading = true;
    this.responseText = '';
    this.queryId = null; // Reset previous query ID

    try {
      console.log("📤 Sending Query:", this.queryText);
      const userQuery = this.queryText; // ✅ Store query before clearing input

      const response = await axios.post("http://127.0.0.1:5000/query", { query: this.queryText });

      const formattedResponse = this.formatResponse(response.data.response);
      this.animateText(formattedResponse);
      this.queryText = '';


      const docId = await this.firestoreService.saveQuery(userQuery, formattedResponse);
      this.queryId = docId;
      this.comments = [];

      console.log("✅ Query Saved:", { id: this.queryId, query: userQuery, response: formattedResponse });
    } catch (error) {
      console.error("🔥 Error in sendQuery:", error);
      this.responseText = '⚠️ Error fetching data.';
    } finally {
      this.loading = false;
    }
  }


  formatResponse(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
      .replace(/  /g, '&nbsp;&nbsp;');
  }

  // Function to animate text printing one word at a time
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

  toggleComment() {
    this.showCommentBox = !this.showCommentBox;
  }

  // Add Comment to the Specific Query
  async addComment() {
    if (!this.commentText || !this.queryId) return;

    try {
      await this.firestoreService.addComment(this.queryId, this.commentText);
      this.comments.push(this.commentText);
      console.log(`📌 Comment Added to Query ${this.queryId}:`, this.commentText);
      this.commentText = '';
    } catch (error) {
      console.error("🔥 Error adding comment:", error);
    }
  }
}
