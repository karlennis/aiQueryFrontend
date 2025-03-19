import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  queryHistory: any[] = [];

  constructor(private firestoreService: FirestoreService) {}

  async ngOnInit() {
    this.queryHistory = await this.firestoreService.getAllQueries();
  }
}
