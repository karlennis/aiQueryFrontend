import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, updateDoc, arrayUnion, getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}


  async saveQuery(query: string, response: string): Promise<string> {
    try {
      console.log("📤 Saving Query:", query); // Debugging log

      const queriesRef = collection(this.firestore, 'queries');
      const docRef = await addDoc(queriesRef, {
        query: query,
        response: response,
        comments: []
      });

      console.log("✅ Query Saved with ID:", docRef.id); // Debugging log
      return docRef.id;
    } catch (error) {
      console.error('🔥 Error saving query:', error);
      throw error;
    }
  }


  async getAllQueries() {
    try {
      const queriesRef = collection(this.firestore, 'queries');
      const querySnapshot = await getDocs(queriesRef);

      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as { [key: string]: any };
        return {
          id: docSnap.id,
          query: data['query'] || "❌ Missing Query",
          response: data['response'] || "❌ Missing Response",
          comments: data['comments'] || []
        };
      });
    } catch (error) {
      console.error('🔥 Error fetching queries:', error);
      return [];
    }
  }


  async addComment(queryId: string, comment: string) {
    try {
      const queryDocRef = doc(this.firestore, 'queries', queryId);
      await updateDoc(queryDocRef, { comments: arrayUnion(comment) });

      console.log(`✅ Added comment to query ${queryId}:`, comment);
    } catch (error) {
      console.error('🔥 Error adding comment:', error);
      throw error;
    }
  }


  async getComments(queryId: string): Promise<string[]> {
    try {
      const queryDocRef = doc(this.firestore, 'queries', queryId);
      const docSnap = await getDoc(queryDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as { [key: string]: any };
        return data['comments'] || [];
      }
      return [];
    } catch (error) {
      console.error('🔥 Error fetching comments:', error);
      return [];
    }
  }
}
