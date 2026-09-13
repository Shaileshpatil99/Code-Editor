import EmptyState from '@/components/ui/empty-state';
import AddNewButton from '@/features/dashboard/actions/components/add-new-button'
import AddRepoButton from '@/features/dashboard/actions/components/add-repo.button'
import React from 'react';
import {deleteProjectById, duplicateProjectById, editProjectById, getPlaygroundForUser, toggleProjectFavorite} from "@/features/dashboard/actions";
import ProjectTable from '@/features/dashboard/actions/components/project-table';

const Page = async() => {
  const playgrounds = await getPlaygroundForUser();  

  return (
    <div className='flex flex-col justify-start items-center min-h-screen mx-auto max-w-7xl px-4 py-10'>
      <div className='grid gird-cols-1 md:grid-cols-2 gap-6 w-full'>
        <AddNewButton/>
        <AddRepoButton/>
      </div>

      <div className='mt-10 flex flex-col justify-center intems-center w-full'>
    {
      playgrounds && playgrounds.length === 0 ? (<EmptyState title='No project Found' description='Create a new project to get started' imageSrc='/empty-state.svg'/>) : (
          <ProjectTable
          
            projects={(playgrounds as any) || []}
            onDeleteProject={deleteProjectById}
            onUpdateProject={editProjectById}
            onDuplicateProject={duplicateProjectById}
             onMarkasFavorite={toggleProjectFavorite}
          />
      )
    }
      </div>
    </div>
  )
}

export default Page
