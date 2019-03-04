export const workItemAPI = {
  workItemData: [],
  _fetchData: async function(){
    console.log()
    let data;
    if(this.workItemData.length === 0){
      const key = process.env.REACT_APP_DRIBBBLE_TOKEN
      const url = 'https://api.dribbble.com/v2/user/shots?page=1&per_page=100';
      const response = await fetch(url + '&access_token=' + key);
      data = await response.json();
      this.workItemData = data;
    } else{
      data = this.workItemData;
    }
    return data;
  },

  _findItem: function(workItemData, id){
    let data;
    workItemData.forEach((workItem, index) => {
      if(workItem.id.toString() === id){
        data = workItem;
      }});
    return data;
  },

  getAllWorkItems: async function(){
    let data = await this._fetchData();
    return data;
  },

  getSingleItem: async function(id){
    let data;
    if(this.workItemData.length > 0){
      data = this._findItem(this.workItemData, id);
    } else {
      let allData = await this._fetchData();
      data = this._findItem(allData, id); 
    }
    return data;
  }
}

export default workItemAPI;