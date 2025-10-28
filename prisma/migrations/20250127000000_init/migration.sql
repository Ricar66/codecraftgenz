-- CreateTable
CREATE TABLE [dbo].[projects] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NTEXT,
    [status] NVARCHAR(50) NOT NULL CONSTRAINT [projects_status_df] DEFAULT 'pending',
    [progress] INT NOT NULL CONSTRAINT [projects_progress_df] DEFAULT 0,
    [imageUrl] NVARCHAR(500),
    [demoUrl] NVARCHAR(500),
    [githubUrl] NVARCHAR(500),
    [technologies] NTEXT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [projects_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [projects_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[feedbacks] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(255),
    [rating] INT NOT NULL CONSTRAINT [feedbacks_rating_df] DEFAULT 5,
    [message] NTEXT NOT NULL,
    [type] NVARCHAR(50) NOT NULL CONSTRAINT [feedbacks_type_df] DEFAULT 'general',
    [isPublic] BIT NOT NULL CONSTRAINT [feedbacks_isPublic_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [feedbacks_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [feedbacks_pkey] PRIMARY KEY CLUSTERED ([id])
);