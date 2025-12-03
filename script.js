// View switching function
function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(viewName + '-view').classList.add('active');
    
    // Activate selected tab
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
}

// Replace your hardcoded initialRankings with:
let initialRankings = [];

// Load rankings from JSON file
fetch('/rankings.json')
    .then(response => response.json())
    .then(data => {
        initialRankings = data;
        rankings = [...initialRankings];
        renderRankings();
        updateBracket();
    })
    .catch(error => {
        console.error('Failed to load rankings, using fallback data');
        // Your current hardcoded data as fallback
        initialRankings = [/* your current data */];
        rankings = [...initialRankings];
        renderRankings();
        updateBracket();
    });
  
  let rankings = [...initialRankings];
  let bracket = {
      firstRound: [],
      quarterfinals: [],
      semifinals: [
          { team1: null, team2: null },
          { team1: null, team2: null }
      ],
      championship: null,
      champion: null
  };



  
// Modified calculateSeeds - Top 5 conference champions must be in the playoff
function calculateSeeds() {
    let seeds = new Array(12);
    let assignedTeams = new Set();
    
    // Collect all conference champions sorted by ranking
    let confChamps = rankings.filter(team => team.champ);
    
    // Only the top 5 conference champions are guaranteed playoff spots
    let guaranteedChamps = confChamps.slice(0, 5);
    
    // First pass: Fill seeds with highest ranked teams
    let seedIndex = 0;
    for (let i = 0; i < rankings.length && seedIndex < 12; i++) {
        seeds[seedIndex] = { ...rankings[i], seed: seedIndex + 1 };
        assignedTeams.add(rankings[i].id);
        seedIndex++;
    }
    
    // Check if all top 5 conference champions are in the top 12
    let missingChamps = guaranteedChamps.filter(champ => !assignedTeams.has(champ.id));
    
    // If any of the top 5 conference champions are missing, force them in from highest to lowest ranked
    if (missingChamps.length > 0) {
        // Sort missing champs by their ranking (they're already in ranking order from the filter)
        // For each missing champion, replace the lowest non-champion team
        missingChamps.forEach(missingChamp => {
            // Find the lowest seeded team that is NOT in the top 5 conference champions
            for (let i = 11; i >= 0; i--) {
                let isGuaranteedChamp = guaranteedChamps.some(champ => champ.id === seeds[i].id);
                if (!isGuaranteedChamp) {
                    // Replace this team with the missing conference champion
                    assignedTeams.delete(seeds[i].id);
                    seeds[i] = { ...missingChamp, seed: i + 1 };
                    assignedTeams.add(missingChamp.id);
                    break;
                }
            }
        });
        
        // Now we need to sort the replaced teams to maintain proper seeding order
        // Get all teams that were inserted
        let insertedPositions = [];
        missingChamps.forEach(champ => {
            let pos = seeds.findIndex(s => s.id === champ.id);
            if (pos !== -1) {
                insertedPositions.push(pos);
            }
        });
        
        // Sort inserted positions from highest to lowest (11, 10, 9...)
        insertedPositions.sort((a, b) => b - a);
        
        // Assign missing champs to these positions in ranking order (highest ranked gets highest seed)
        missingChamps.forEach((champ, index) => {
            seeds[insertedPositions[index]] = { ...champ, seed: insertedPositions[index] + 1 };
        });
    }
    
    // Re-assign seed numbers based on final positions
    seeds.forEach((team, index) => {
        team.seed = index + 1;
    });

    return seeds;
}
  
  // Update bracket based on current seeds
  function updateBracket() {
      const seeds = calculateSeeds();
      
      // Set up first round matchups according to specified pattern
      bracket.firstRound = [
          { higher: seeds[7], lower: seeds[8] },    // 8 vs 9
          { higher: seeds[4], lower: seeds[11] },   // 5 vs 12
          { higher: seeds[6], lower: seeds[9] },    // 7 vs 10
          { higher: seeds[5], lower: seeds[10] }    // 6 vs 11
      ];
  
      // Reset later rounds when bracket is updated
      bracket.quarterfinals = [
          { awaitingWinner: true, higher: seeds[0] }, // 1 seed awaiting winner
          { awaitingWinner: true, higher: seeds[3] }, // 4 seed awaiting winner
          { awaitingWinner: true, higher: seeds[1] }, // 2 seed awaiting winner
          { awaitingWinner: true, higher: seeds[2] }  // 3 seed awaiting winner
      ];
      bracket.semifinals = [
          { team1: null, team2: null },
          { team1: null, team2: null }
      ];
      bracket.championship = null;
  
      renderBracket();
  }

// Add this to the existing script

// Function to move team up in rankings
function moveTeamUp(index) {
    if (index > 0) {
        const newRankings = [...rankings];
        [newRankings[index], newRankings[index - 1]] = [newRankings[index - 1], newRankings[index]];
        rankings = newRankings;
        renderRankings();
        updateBracket();
    }
}

// Function to move team down in rankings
function moveTeamDown(index) {
    if (index < rankings.length - 1) {
        const newRankings = [...rankings];
        [newRankings[index], newRankings[index + 1]] = [newRankings[index + 1], newRankings[index]];
        rankings = newRankings;
        renderRankings();
        updateBracket();
    }
}

// Modify renderRankings to add right-click event for conference champion selection
function renderRankings() {
    const rankingsList = document.getElementById('rankings-list');
    rankingsList.innerHTML = '';
    
    const seeds = calculateSeeds();

    rankings.forEach((team, index) => {
        const rankingNumber = document.createElement('div');
        rankingNumber.className = 'team-number';
        rankingNumber.textContent = index + 1;
        
        teamSeed = seeds.findIndex((seed) => seed.id === team.id);

        if (teamSeed < 0) {
            rankingNumber.style.color = '#999';
        }

        const teamCard = document.createElement('div');
        teamCard.className = `team-card ${teamSeed < 0 ? 'non-playoff' : ''}`;
        teamCard.draggable = true;
        teamCard.dataset.index = index;
        teamCard.dataset.conference = team.conference;

        // Determine trophy display based on conference champion status
        let trophy = '';
        
        if (team.champ) {
            trophy = '/other-logos/goldtrophy.png';
        } else {
            trophy = '/other-logos/notrophy.png';
        }

        teamCard.innerHTML = `
            <div class="team-logo">
                <img src="${team.logo}" alt="${team.name} logo" 
                     onerror="this.src='/team-logos/placeholder.png'">
            </div>
            <div class="team-info">
                <div class="team-name">${team.name}</div>
                <div class="conference-info"> 
                    <div class="team-record">(${team.record})</div>
                    <div class="team-conference">${team.conference}</div>
                    <div class="trophy"><img src="${trophy}" alt="Trophy"></div>
                </div>
            </div>
        `;

        // Add arrow buttons container
        const arrowButtons = document.createElement('div');
        arrowButtons.className = 'arrow-buttons';
        
        const upButton = document.createElement('button');
        upButton.className = 'arrow-button up';
        upButton.innerHTML = '↑';
        upButton.disabled = index === 0;
        upButton.onclick = (e) => {
            e.stopPropagation();
            moveTeamUp(index);
        };
        
        const downButton = document.createElement('button');
        downButton.className = 'arrow-button down';
        downButton.innerHTML = '↓';
        downButton.disabled = index === rankings.length - 1;
        downButton.onclick = (e) => {
            e.stopPropagation();
            moveTeamDown(index);
        };
        
        arrowButtons.appendChild(upButton);
        arrowButtons.appendChild(downButton);
        teamCard.appendChild(arrowButtons);

        teamCard.addEventListener('contextmenu', function(e) {
            e.preventDefault();

            // Don't allow changing champion status for Ind or Pac-12
            if (team.conference === 'Ind' || team.conference === 'Pac-12') {
                return;
            }

            // Toggle conference champion status
            if (team.champ) {
                // If already a champion, remove champion status
                team.champ = false;
            } else {
                // Set this team as conference champion and remove from others in same conference
                for (let i = 0; i < rankings.length; i++) {
                    if (rankings[i].conference === team.conference) {
                        rankings[i].champ = false;
                    }
                }
                team.champ = true;
            }
            
            renderRankings();
            updateBracket();
        });

        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.appendChild(rankingNumber);
        wrapper.appendChild(teamCard);

        teamCard.addEventListener('dragstart', handleDragStart);
        teamCard.addEventListener('dragend', handleDragEnd);
        teamCard.addEventListener('dragover', handleDragOver);
        teamCard.addEventListener('drop', handleDrop);

        rankingsList.appendChild(wrapper);
    });
}

function renderBracket() {
    // Update first round rendering with bowl logos
    const firstRound = document.getElementById('first-round');
    firstRound.innerHTML = bracket.firstRound.map((matchup, index) => `
        <div class="matchup" data-round="firstRound" data-index="${index}">
            <div class="team-slot ${isWinner('firstRound', index, matchup.higher) ? 'winner' : ''}"
                 onclick="handleTeamSelect('firstRound', ${index}, 'higher')">
                <img src="${matchup.higher.logo}" alt="" class="bracket-team-logo">
                <span>${matchup.higher.seed} ${matchup.higher.name}</span>
            </div>
            <div class="team-slot ${isWinner('firstRound', index, matchup.lower) ? 'winner' : ''}"
                 onclick="handleTeamSelect('firstRound', ${index}, 'lower')">
                <img src="${matchup.lower.logo}" alt="" class="bracket-team-logo">
                <span>${matchup.lower.seed} ${matchup.lower.name}</span>
            </div>
        </div>
    `).join('');

    // Update quarterfinals rendering with bowl logos
    const quarterfinals = document.getElementById('quarterfinals');
    quarterfinals.innerHTML = bracket.quarterfinals.map((matchup, index) => {
        return `
            <div class="matchup" data-round="quarterfinals" data-index="${index}">
                <div class="team-slot ${isWinner('quarterfinals', index, matchup.higher) ? 'winner' : ''}"
                     onclick="handleTeamSelect('quarterfinals', ${index}, 'higher')">
                    <img src="${matchup.higher.logo}" alt="" class="bracket-team-logo">
                    <span>${matchup.higher.seed} ${matchup.higher.name}</span>
                </div>
                <div class="team-slot ${isWinner('quarterfinals', index, matchup.winner) ? 'winner' : ''}"
                     onclick="handleTeamSelect('quarterfinals', ${index}, 'winner')">
                    ${matchup.winner ? `
                        <img src="${matchup.winner.logo}" alt="" class="bracket-team-logo">
                        <span>${matchup.winner.seed} ${matchup.winner.name}</span>
                    ` : '-'}
                </div>
            </div>
        `;
    }).join('');

    // Update semifinals rendering
    const semifinals = document.getElementById('semifinals');
    semifinals.innerHTML = bracket.semifinals.map((matchup, index) => {
        return `
        <div class="matchup" data-round="semifinals" data-index="${index}">
            <div class="team-slot ${isWinner('semifinals', index, matchup?.team1) ? 'winner' : ''}"
                 onclick="handleTeamSelect('semifinals', ${index}, 'team1')">
                ${matchup?.team1 ? `
                    <img src="${matchup.team1.logo}" alt="" class="bracket-team-logo">
                    <span>${matchup.team1.seed} ${matchup.team1.name}</span>
                ` : '-'}
            </div>
            <div class="team-slot ${isWinner('semifinals', index, matchup?.team2) ? 'winner' : ''}"
                 onclick="handleTeamSelect('semifinals', ${index}, 'team2')">
                ${matchup?.team2 ? `
                    <img src="${matchup.team2.logo}" alt="" class="bracket-team-logo">
                    <span>${matchup.team2.seed} ${matchup.team2.name}</span>
                ` : '-'}
            </div>
        </div>
    `}).join('');

    // Update championship rendering
    const championship = document.getElementById('championship');
    championship.innerHTML = `
        <div class="matchup">
            <div class="team-slot ${isWinner('championship', 0, bracket.championship?.team1) ? 'winner' : ''}"
                 onclick="handleTeamSelect('championship', 0, 'team1')">
                ${bracket.championship?.team1 ? `
                    <img src="${bracket.championship.team1.logo}" alt="" class="bracket-team-logo">
                    <span>${bracket.championship.team1.seed} ${bracket.championship.team1.name}</span>
                ` : '-'}
            </div>
            <div class="team-slot ${isWinner('championship', 0, bracket.championship?.team2) ? 'winner' : ''}"
                 onclick="handleTeamSelect('championship', 0, 'team2')">
                ${bracket.championship?.team2 ? `
                    <img src="${bracket.championship.team2.logo}" alt="" class="bracket-team-logo">
                    <span>${bracket.championship.team2.seed} ${bracket.championship.team2.name}</span>
                ` : '-'}
            </div>
        </div>
    `;

    // Update champion display with logo
    const championDisplay = document.getElementById('champion-display');
    if (bracket.champion) {
        championDisplay.innerHTML = `
            <img src="${bracket.champion.logo}" alt="" class="champion-team-logo">
            <div> 2026 CFP NATIONAL CHAMPION </div>
            <div class="champion-name">
                ${bracket.champion.name}
            </div>
        `;
        championDisplay.classList.add('show');
    } else {
        championDisplay.innerHTML = '';
        championDisplay.classList.remove('show');
    }
}
  
  // Helper function to create champion display if it doesn't exist
  function createChampionDisplay() {
      const championDisplay = document.createElement('div');
      championDisplay.id = 'champion-display';
      championDisplay.className = 'champion-display';
      document.querySelector('.bracket').appendChild(championDisplay);
      return championDisplay;
  }
  
  // Modified handleTeamSelect function
  function handleTeamSelect(round, index, position) {
      if (round === 'firstRound') {
          const matchup = bracket.firstRound[index];
          const winner = position === 'higher' ? matchup.higher : matchup.lower;
          
          // Map first round winners to correct quarterfinal games
          let quarterfinalsIndex;
          switch(index) {
              case 0: // 8v9 winner goes to QF Game 1 (vs 1 seed)
                  quarterfinalsIndex = 0;
                  break;
              case 1: // 5v12 winner goes to QF Game 2 (vs 4 seed)
                  quarterfinalsIndex = 1;
                  break;
              case 2: // 7v10 winner goes to QF Game 3 (vs 2 seed)
                  quarterfinalsIndex = 2;
                  break;
              case 3: // 6v11 winner goes to QF Game 4 (vs 3 seed)
                  quarterfinalsIndex = 3;
                  break;
          }
          bracket.quarterfinals[quarterfinalsIndex].winner = winner;
      } else if (round === 'quarterfinals') {
          const matchup = bracket.quarterfinals[index];
          const winner = position === 'higher' ? matchup.higher : matchup.winner;
          if (!winner) return; // Don't proceed if winner isn't available
          
          const semifinalsIndex = Math.floor(index/2);
          if (!bracket.semifinals[semifinalsIndex]) {
              bracket.semifinals[semifinalsIndex] = {};
          }
          if (index % 2 === 0) {
              bracket.semifinals[semifinalsIndex].team1 = winner;
          } else {
              bracket.semifinals[semifinalsIndex].team2 = winner;
          }
      } else if (round === 'semifinals') {
          const matchup = bracket.semifinals[index];
          const winner = position === 'team1' ? matchup.team1 : matchup.team2;
          if (!winner) return;
          
          if (!bracket.championship) {
              bracket.championship = {};
          }
          if (index === 0) {
              bracket.championship.team1 = winner;
          } else {
              bracket.championship.team2 = winner;
          }
      } else   if (round === 'championship') {
          const winner = position === 'team1' ? bracket.championship.team1 : bracket.championship.team2;
          if (!winner) return;
          bracket.champion = winner;
      }
      renderBracket();
  }
  
 // Modified isWinner function
function isWinner(round, index, team) {
    if (!team) return false;
    
    if (round === 'firstRound') {
        // Old incorrect logic that only worked for first game:
        // const quarterfinalsIndex = Math.floor(index/2);
        
        // New logic: Each first round winner goes to their specific quarterfinal game
        // Game 0 (8v9) winner goes to QF Game 0 (vs 1 seed)
        // Game 1 (5v12) winner goes to QF Game 1 (vs 4 seed)
        // Game 2 (7v10) winner goes to QF Game 2 (vs 2 seed)
        // Game 3 (6v11) winner goes to QF Game 3 (vs 3 seed)
        return bracket.quarterfinals[index]?.winner?.id === team.id;
    } else if (round === 'quarterfinals') {
        const semifinalsIndex = Math.floor(index/2);
        return bracket.semifinals[semifinalsIndex]?.team1?.id === team.id || 
               bracket.semifinals[semifinalsIndex]?.team2?.id === team.id;
    } else if (round === 'semifinals') {
        return bracket.championship?.team1?.id === team.id || 
               bracket.championship?.team2?.id === team.id;
    } else if (round === 'championship') {
        return bracket.champion?.id === team.id;
    }
    return false;
}
  // Reset bracket function
  function resetBracket() {
      bracket = {
          firstRound: [],
          quarterfinals: [],
          semifinals: [
              { team1: null, team2: null },
              { team1: null, team2: null }
          ],
          championship: null,
          champion: null
      };
      updateBracket();
  }
  
  // Existing drag and drop handlers
  let draggedIndex = null;
  
  function handleDragStart(e) {
      draggedIndex = parseInt(e.target.dataset.index);
      e.target.classList.add('dragging');
  }
  
  function handleDragEnd(e) {
      e.target.classList.remove('dragging');
  }
  
  function handleDragOver(e) {
      e.preventDefault();
  }
  


  function handleDrop(e) {
      e.preventDefault();
      const dropIndex = parseInt(e.target.closest('.team-card').dataset.index);
      
      if (draggedIndex !== null && draggedIndex !== dropIndex) {
          const newRankings = [...rankings];
          const [draggedTeam] = newRankings.splice(draggedIndex, 1);
          newRankings.splice(dropIndex, 0, draggedTeam);
          rankings = newRankings;
          renderRankings();
          updateBracket();
      }
      draggedIndex = null;
  }
  
  function resetBracket() {
      bracket = {
          firstRound: [],
          quarterfinals: [],
          semifinals: [
              { team1: null, team2: null },
              { team1: null, team2: null }
          ],
          championship: null,
          champion: null
      };
      updateBracket();
      
      // Reset champion display
      const championDisplay = document.getElementById('champion-display');
      championDisplay.classList.remove('show');
  }
  


  
  // Initial render
  renderRankings();
  updateBracket();