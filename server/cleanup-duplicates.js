require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const cleanupDuplicates = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelanceflow');
        console.log('✅ Connected to MongoDB');

        console.log('\n🧹 Starting project deduplication cleanup...\n');

        const users = await User.find({
            $or: [
                { my_projects: { $exists: true, $ne: [] } },
                { my_clients: { $exists: true, $ne: [] } }
            ]
        });

        console.log(`Found ${users.length} freelancers with projects/clients\n`);

        let totalDuplicatesRemoved = 0;
        const results = [];

        for (const user of users) {
            let duplicatesForUser = 0;
            let projectsBeforeCount = user.my_projects?.length || 0;
            let clientsBeforeCount = user.my_clients?.length || 0;

            // Deduplicate my_projects
            if (user.my_projects && user.my_projects.length > 0) {
                const uniqueProjectIds = new Set();
                const uniqueProjects = [];

                for (const project of user.my_projects) {
                    const projectId = project.project_id?.toString();
                    if (projectId && !uniqueProjectIds.has(projectId)) {
                        uniqueProjectIds.add(projectId);
                        uniqueProjects.push(project);
                    } else if (projectId) {
                        duplicatesForUser++;
                    }
                }

                if (uniqueProjects.length !== user.my_projects.length) {
                    user.my_projects = uniqueProjects;
                    user.total_projects_assigned = uniqueProjects.length;
                }
            }

            // Deduplicate my_clients
            if (user.my_clients && user.my_clients.length > 0) {
                const uniqueClientIds = new Set();
                const uniqueClients = [];

                for (const client of user.my_clients) {
                    const projectId = client.project_id?.toString();
                    if (projectId && !uniqueClientIds.has(projectId)) {
                        uniqueClientIds.add(projectId);
                        uniqueClients.push(client);
                    } else if (projectId) {
                        duplicatesForUser++;
                    }
                }

                if (uniqueClients.length !== user.my_clients.length) {
                    user.my_clients = uniqueClients;
                    user.total_clients = uniqueClients.length;
                }
            }

            if (duplicatesForUser > 0) {
                await user.save();
                totalDuplicatesRemoved += duplicatesForUser;
                results.push({
                    freelancer: user.full_name,
                    projects_before: projectsBeforeCount,
                    projects_after: user.my_projects?.length || 0,
                    clients_before: clientsBeforeCount,
                    clients_after: user.my_clients?.length || 0,
                    duplicates_removed: duplicatesForUser
                });
                console.log(`✅ ${user.full_name}: Removed ${duplicatesForUser} duplicate(s)`);
                console.log(`   Projects: ${projectsBeforeCount} → ${user.my_projects?.length || 0}`);
                console.log(`   Clients: ${clientsBeforeCount} → ${user.my_clients?.length || 0}\n`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 CLEANUP COMPLETE');
        console.log('='.repeat(60));
        console.log(`Total duplicates removed: ${totalDuplicatesRemoved}`);
        console.log(`Freelancers updated: ${results.length}`);
        console.log('='.repeat(60) + '\n');

        if (results.length > 0) {
            console.log('📊 Summary:\n');
            results.forEach((r, idx) => {
                console.log(`${idx + 1}. ${r.freelancer}`);
                console.log(`   Duplicates removed: ${r.duplicates_removed}`);
                console.log(`   Projects: ${r.projects_before} → ${r.projects_after}`);
                console.log(`   Clients: ${r.clients_before} → ${r.clients_after}\n`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error during cleanup:', err.message);
        process.exit(1);
    }
};

cleanupDuplicates();
