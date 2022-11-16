const { OmnibarInterface } = require('nodecg-omnibar');
const { upcomingItemCount } = require('./config.json');
const { add } = require('date-fns');

module.exports = async nodecg => {
  const omnibar = new OmnibarInterface(nodecg);

  omnibar.registerItemType('speedcontrol-omnibar-schedule', 'schedule-item', 'Schedule - {{game}}', {
    cssAssets: ['css/omnibar-item.css'],
  });

  const omnibarState = nodecg.Replicant('nodecg-omnibar', 'nodecg-omnibar', { persistent: false });
  const runDataArray = nodecg.Replicant('runDataArray', 'nodecg-speedcontrol');
	const runDataActiveRunSurrounding = nodecg.Replicant('runDataActiveRunSurrounding', 'nodecg-speedcontrol');

  function getNextRunIndex() {
    const pendingRunId = runDataActiveRunSurrounding.value.next;
    
    for (const [index, run] of runDataArray.value.entries()) {
      if (run.id === pendingRunId) return index;
    }
    
    return -1;
  }

  function createRunItemConfig(run, estimatedStart, index) {
    const runnerTeams = run.teams.filter(team => {
      const name = team.name?.toLowerCase() ?? '';
        
      return name.indexOf('host') === -1 && name.indexOf('commentary') === -1;
    });

    const runners = runnerTeams.reduce((acc, team) => [
      ...acc, 
      ...team.players.map(player => player.name),
    ], []);

    return {
      runId: run.id,
      game: run.game,
      runners,
      isNext: index === 0,
      estimatedStart,
    };
  }

  function updateUpcomingRuns() {
    const enqueuedScheduleItems = omnibarState.value.carouselQueue.filter(item => item.type === 'schedule-item');

    // Remove the existing schedule items.
    enqueuedScheduleItems.forEach(item => {
      omnibar.dequeueCarouselItem(item.id);
    });

    // Enqueue the upcoming schedule items
    const nextRunIndex = getNextRunIndex();

    if (nextRunIndex === -1) return;
  
    const [upcomingRuns] = [...new Array(upcomingItemCount)].reduce(([list, estimatedStart], _, index) => {
      const run = runDataArray.value[nextRunIndex + index];

      if (run) {
        return [
          [...list, createRunItemConfig(run, estimatedStart, index)],
          add(estimatedStart, { seconds: run.estimateS + run.setupTimeS }),
        ];
      }

      return [list, estimatedStart];
    }, [[], new Date()]);

    upcomingRuns.forEach(upcomingRun => {
      omnibar.enqueueCarouselItem('schedule-item', upcomingRun, { autoGroup: true });
    });    
  }

  runDataActiveRunSurrounding.on('change', updateUpcomingRuns);
};
